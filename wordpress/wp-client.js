function requireEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required env var: ${name}`);
    return value;
}

export function wpClient() {
    const baseUrl = requireEnv('WORDPRESS_URL').replace(/\/$/, '');
    const user = requireEnv('WORDPRESS_USER');
    const appPassword = requireEnv('WORDPRESS_APP_PASSWORD');
    const auth = Buffer.from(`${user}:${appPassword}`).toString('base64');

    async function request(path, options = {}) {
        const res = await fetch(`${baseUrl}/wp-json/wp/v2${path}`, {
            ...options,
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`WordPress API ${options.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
        }
        return res.json();
    }

    return { request };
}
