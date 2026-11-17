import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Chỉ hỗ trợ POST." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response({ error: "Edge Function chưa được cấu hình đủ biến môi trường Supabase." }, 500);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return response({ error: "Bạn cần đăng nhập để quản lý tài khoản." }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user || authData.user.is_anonymous) {
    return response({ error: "Phiên đăng nhập không hợp lệ." }, 401);
  }

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("vai_tro")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) return response({ error: `Không kiểm tra được quyền tài khoản: ${profileError.message}` }, 500);
  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.vai_tro)) {
    return response({ error: "Chỉ quản trị viên mới được quản lý tài khoản admin." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return response({ error: "Dữ liệu yêu cầu không phải JSON hợp lệ." }, 400);
  }

  const action = payload.action;
  if (action === "list") {
    const [{ data: profiles, error: listProfilesError }, users] = await Promise.all([
      adminClient.from("profiles").select("id,ho_ten,vai_tro").in("vai_tro", ["admin", "super_admin"]).order("ho_ten"),
      (async () => {
        const allUsers = [];
        for (let page = 1; ; page += 1) {
          const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) return { users: null, error };
          allUsers.push(...data.users);
          if (data.users.length < 1000) return { users: allUsers, error: null };
        }
      })(),
    ]);
    if (listProfilesError) return response({ error: `Không tải được vai trò tài khoản: ${listProfilesError.message}` }, 500);
    if (users.error) return response({ error: `Không tải được tài khoản đăng nhập: ${users.error.message}` }, 500);
    const authUsers = new Map(users.users.map((user) => [user.id, user]));
    return response({
      users: profiles.map((profile) => {
        const authUser = authUsers.get(profile.id);
        return {
          id: profile.id,
          email: authUser?.email ?? "",
          ho_ten: authUser?.user_metadata?.ho_ten ?? profile.ho_ten ?? "",
          vai_tro: profile.vai_tro,
        };
      }),
    });
  }

  if (action === "create") {
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const hoTen = typeof payload.ho_ten === "string" ? payload.ho_ten.trim() : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    if (!email || !hoTen || password.length < 8) {
      return response({ error: "Hãy nhập email, họ tên và mật khẩu có ít nhất 8 ký tự." }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { ho_ten: hoTen },
    });
    if (createError) return response({ error: `Không tạo được tài khoản: ${createError.message}` }, 400);
    const { data: updatedProfile, error: roleError } = await adminClient
      .from("profiles")
      .update({ ho_ten: hoTen, vai_tro: "admin" })
      .eq("id", created.user.id)
      .select("id")
      .maybeSingle();
    if (roleError || !updatedProfile) {
      const { error: rollbackError } = await adminClient.auth.admin.deleteUser(created.user.id);
      const rollbackMessage = rollbackError ? ` Không thu hồi được tài khoản tạo dở: ${rollbackError.message}` : "";
      return response({ error: `Đã tạo đăng nhập nhưng không cấp được quyền admin${roleError ? `: ${roleError.message}` : " vì không tìm thấy hồ sơ"}.${rollbackMessage}` }, 500);
    }
    return response({ ok: true });
  }

  if (action === "update" || action === "delete") {
    const userId = typeof payload.user_id === "string" ? payload.user_id : "";
    if (!userId) return response({ error: "Thiếu mã tài khoản." }, 400);
    if (userId === authData.user.id && action === "delete") {
      return response({ error: "Không thể xóa tài khoản đang đăng nhập." }, 400);
    }

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("vai_tro")
      .eq("id", userId)
      .maybeSingle();
    if (targetError) return response({ error: `Không kiểm tra được tài khoản: ${targetError.message}` }, 500);
    if (!target || !["admin", "super_admin"].includes(target.vai_tro)) {
      return response({ error: "Không tìm thấy tài khoản admin." }, 404);
    }
    if (target.vai_tro === "super_admin" && callerProfile.vai_tro !== "super_admin") {
      return response({ error: "Chỉ quản trị viên cấp cao mới được sửa tài khoản quản trị cấp cao." }, 403);
    }
    if (action === "delete" && target.vai_tro === "super_admin") {
      return response({ error: "Không thể xóa tài khoản quản trị cấp cao tại đây." }, 403);
    }

    if (action === "delete") {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      return error
        ? response({ error: `Không xóa được tài khoản: ${error.message}` }, 400)
        : response({ ok: true });
    }

    const updates: { email?: string; password?: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> } = {};
    if (typeof payload.email === "string") {
      const email = payload.email.trim().toLowerCase();
      if (!email) return response({ error: "Email không được để trống." }, 400);
      updates.email = email;
      updates.email_confirm = true;
    }
    if (typeof payload.password === "string" && payload.password) {
      if (payload.password.length < 8) return response({ error: "Mật khẩu mới phải có ít nhất 8 ký tự." }, 400);
      updates.password = payload.password;
    }
    let updatedName: string | null = null;
    if (typeof payload.ho_ten === "string") {
      const hoTen = payload.ho_ten.trim();
      if (!hoTen) return response({ error: "Họ tên không được để trống." }, 400);
      updates.user_metadata = { ho_ten: hoTen };
      updatedName = hoTen;
    }
    if (!Object.keys(updates).length) return response({ error: "Không có thông tin nào để cập nhật." }, 400);
    const { error } = await adminClient.auth.admin.updateUserById(userId, updates);
    if (error) return response({ error: `Không cập nhật được đăng nhập: ${error.message}` }, 400);
    if (updatedName) {
      const { error: profileUpdateError } = await adminClient.from("profiles").update({ ho_ten: updatedName }).eq("id", userId);
      if (profileUpdateError) return response({ error: `Đã cập nhật thông tin đăng nhập nhưng không cập nhật được họ tên hồ sơ: ${profileUpdateError.message}` }, 400);
    }
    return response({ ok: true });
  }

  return response({ error: "Thao tác tài khoản không hợp lệ." }, 400);
});
