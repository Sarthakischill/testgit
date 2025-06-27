import { compare } from 'bcrypt';
// @ts-ignore
import { withIronSessionApiRoute } from 'iron-session/next';
import { supabase } from '@/lib/supabase';
import { sessionOptions } from '@/lib/session';

async function loginRoute(req: any, res: any) {
  try {
    const { password } = await req.json();

    if (!password) {
      return new Response(JSON.stringify({ error: 'Password is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: loginData, error: dbError } = await supabase
      .from('gh_login')
      .select('hashed_password')
      .eq('name', 'site_password')
      .single();

    if (dbError || !loginData) {
      console.error('DB Error or no password configured:', dbError?.message);
      return new Response(JSON.stringify({ error: 'Site login is not configured correctly. Please contact an administrator.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    const isMatch = await compare(password, loginData.hashed_password);

    if (!isMatch) {
      return new Response(JSON.stringify({ error: 'Invalid password.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    req.session.isLoggedIn = true;
    await req.session.save();
    
    console.log('User successfully logged in.');
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Login API Error:', error.message);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected server error occurred.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function getRoute(req: any, res: any) {
  return new Response('Method Not Allowed', { status: 405 });
}

export const runtime = 'nodejs';

export const GET = withIronSessionApiRoute(getRoute, sessionOptions);
export const POST = withIronSessionApiRoute(loginRoute, sessionOptions); 