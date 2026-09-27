import { Link } from 'react-router-dom';
import { IconFacebook, IconInstagram, IconTikTok, IconWhatsApp, IconYouTube } from './Icons.jsx';

const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'New Arrivals', to: '/shop?category=New%20Arrivals' },
    { label: 'Top Sellers', to: '/shop?category=Top%20Sellers' },
    { label: 'Offers', to: '/shop?category=Offers' },
    { label: 'Limited Edition', to: '/shop?category=Limited%20Edition' },
    { label: 'All Products', to: '/shop' },
    { label: 'Contact Us', to: '/contact' },
];

const policyLinks = [
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Refund and Return Policy', to: '/refund' },
    { label: 'Shipping Policy', to: '/shipping' },
];

const WHATSAPP_NUMBER_DISPLAY = '03350496976';
const WHATSAPP_NUMBER_E164 = '923350496976';

export default function SiteFooter() {
    return (
        <footer className="siteFooter" aria-label="Footer">
            <div className="container footerInner">
                <div className="footerTop">
                    <div className="footerSubscribe">
                        <div className="footerHeading">Join our email list</div>
                        <div className="footerSubheading">
                            Get exclusive deals and early access to new products.
                        </div>
                    </div>

                    <form
                        className="footerForm"
                        onSubmit={(e) => {
                            e.preventDefault();
                        }}
                    >
                        <input
                            className="footerInput"
                            type="email"
                            name="email"
                            placeholder="Email address"
                            autoComplete="email"
                            aria-label="Email address"
                        />
                        <button className="footerSubmit" type="submit" aria-label="Submit">
                            →
                        </button>
                    </form>
                </div>

                <div className="footerGrid">
                    <div className="footerCol">
                        {navLinks.map((l) => (
                            <Link key={l.label} className="footerLink" to={l.to}>
                                {l.label}
                            </Link>
                        ))}
                        <a
                            className="whatsAppButton"
                            href={`https://wa.me/${WHATSAPP_NUMBER_E164}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`WhatsApp ${WHATSAPP_NUMBER_DISPLAY}`}
                        >
                            <IconWhatsApp />
                            <span className="whatsAppText">{WHATSAPP_NUMBER_DISPLAY}</span>
                        </a>
                    </div>

                    <div className="footerCol footerColRight">
                        {policyLinks.map((l) => (
                            <Link key={l.label} className="footerLink" to={l.to}>
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="footerBottom">
                    <div className="footerCopy">© {new Date().getFullYear()} Alif Store</div>
                    <div className="footerSocial" aria-label="Social links">
                        <a className="socialDot" href="#" aria-label="Facebook">
                            <IconFacebook />
                        </a>
                        <a className="socialDot" href="#" aria-label="Instagram">
                            <IconInstagram />
                        </a>
                        <a className="socialDot" href="#" aria-label="YouTube">
                            <IconYouTube />
                        </a>
                        <a className="socialDot" href="#" aria-label="TikTok">
                            <IconTikTok />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
