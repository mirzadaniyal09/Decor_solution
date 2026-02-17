import { useEffect } from 'react';

const TIKTOK_SCRIPT_ID = 'tiktok-embed-script';

function ensureTikTokScriptLoaded() {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById(TIKTOK_SCRIPT_ID);
    if (existing) return;

    const script = document.createElement('script');
    script.id = TIKTOK_SCRIPT_ID;
    script.async = true;
    script.src = 'https://www.tiktok.com/embed.js';
    document.body.appendChild(script);
}

export default function TikTokEmbed({ username }) {
    useEffect(() => {
        ensureTikTokScriptLoaded();

        // If the script is already loaded, ask it to scan the page again.
        const maybeLoad = () => {
            const embed = window?.tiktokEmbed;
            if (embed && typeof embed.load === 'function') embed.load();
        };

        const id = window.setTimeout(maybeLoad, 0);
        return () => window.clearTimeout(id);
    }, []);

    const clean = String(username || '')
        .replace(/^@/, '')
        .trim();

    const profileUrl = `https://www.tiktok.com/@${clean}`;

    return (
        <blockquote
            className="tiktok-embed"
            cite={profileUrl}
            data-unique-id={clean}
            data-embed-type="creator"
            style={{ maxWidth: 780, minWidth: 288 }}
        >
            <section>
                <a target="_blank" rel="noreferrer" href={profileUrl}>
                    @{clean}
                </a>
            </section>
        </blockquote>
    );
}
