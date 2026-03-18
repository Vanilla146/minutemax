import { Link } from 'react-router-dom'
import { FiGrid, FiTwitter, FiFacebook, FiInstagram, FiLinkedin, FiMail, FiPhone, FiMapPin } from 'react-icons/fi'
import './Footer.css'

const Footer = () => {
    const currentYear = new Date().getFullYear()

    const footerLinks = {
        product: [
            { label: 'Virtual Queue', path: '/queue' },
            { label: 'AI Outfit Match', path: '/outfit-match' },
            { label: 'Store Locator', path: '/stores' },
            { label: 'Mobile App', path: '/app' },
        ],
        company: [
            { label: 'About Us', path: '/about' },
            { label: 'Careers', path: '/careers' },
            { label: 'Press', path: '/press' },
            { label: 'Blog', path: '/blog' },
        ],
        support: [
            { label: 'Help Center', path: '/help' },
            { label: 'Contact Us', path: '/contact' },
            { label: 'Privacy Policy', path: '/privacy' },
            { label: 'Terms of Service', path: '/terms' },
        ],
    }

    const socialLinks = [
        { icon: <FiTwitter />, url: '#', label: 'Twitter' },
        { icon: <FiFacebook />, url: '#', label: 'Facebook' },
        { icon: <FiInstagram />, url: '#', label: 'Instagram' },
        { icon: <FiLinkedin />, url: '#', label: 'LinkedIn' },
    ]

    return (
        <footer className="footer">
            <div className="footer-container">
                {/* Main Footer */}
                <div className="footer-main">
                    {/* Brand Section */}
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <div className="logo-icon">
                                <FiGrid />
                            </div>
                            <span className="logo-text">
                                Minute<span className="logo-accent">Max</span>
                            </span>
                        </Link>
                        <p className="footer-tagline">
                            Transform every wasted minute in Sri Lankan apparel stores into productive, joyful shopping time.
                        </p>
                        <div className="footer-contact">
                            <div className="contact-item">
                                <FiMapPin />
                                <span>Colombo, Sri Lanka</span>
                            </div>
                            <div className="contact-item">
                                <FiMail />
                                <span>hello@minutemax.lk</span>
                            </div>
                            <div className="contact-item">
                                <FiPhone />
                                <span>+94 11 234 5678</span>
                            </div>
                        </div>
                    </div>

                    {/* Links Sections */}
                    <div className="footer-links-grid">
                        <div className="footer-links-section">
                            <h4>Product</h4>
                            <ul>
                                {footerLinks.product.map((link) => (
                                    <li key={link.path}>
                                        <Link to={link.path}>{link.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="footer-links-section">
                            <h4>Company</h4>
                            <ul>
                                {footerLinks.company.map((link) => (
                                    <li key={link.path}>
                                        <Link to={link.path}>{link.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="footer-links-section">
                            <h4>Support</h4>
                            <ul>
                                {footerLinks.support.map((link) => (
                                    <li key={link.path}>
                                        <Link to={link.path}>{link.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className="footer-bottom">
                    <p className="copyright">
                        © {currentYear} MinuteMax. All rights reserved.
                    </p>
                    <div className="footer-social">
                        {socialLinks.map((social) => (
                            <a
                                key={social.label}
                                href={social.url}
                                className="social-link"
                                aria-label={social.label}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
