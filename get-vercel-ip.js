// Quick diagnostic script to get Vercel's actual outbound IP
// Deploy this and visit the endpoint to see what IP Vercel uses

export default function handler(req, res) {
    const cloudflareIP = req.headers['cf-connecting-ip'];
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const vercelIP = req.headers['x-vercel-forwarded-for'];

    res.json({
        message: 'Vercel Server IP Information',
        cloudflareIP,
        forwardedFor,
        realIP,
        vercelIP,
        socketIP: req.socket.remoteAddress,
        allHeaders: req.headers
    });
}
