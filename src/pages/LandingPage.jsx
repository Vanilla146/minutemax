import { useEffect, useRef, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { FiArrowRight, FiClock, FiCamera, FiSmartphone, FiTrendingUp, FiUsers, FiShoppingBag, FiCheckCircle, FiStar, FiZap } from 'react-icons/fi'
import './LandingPage.css'

// Images
import heroImage from '../assets/images/hero-shopping.png'

// Lazy load 3D components for better performance
const ShoppingScene = lazy(() => import('../components/3d/ShoppingScene'))

const LandingPage = () => {
    const containerRef = useRef(null)
    const { scrollYProgress } = useScroll({ target: containerRef })

    // Parallax effects
    const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100])
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])

    // Animation variants
    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: 'easeOut' }
    }

    const staggerContainer = {
        initial: {},
        animate: {
            transition: {
                staggerChildren: 0.15
            }
        }
    }

    const features = [
        {
            icon: <FiClock />,
            title: 'Zero Queue Time',
            description: 'Join virtual queues with a single QR scan. Shop freely while your turn approaches.',
            color: '#667eea'
        },
        {
            icon: <FiCamera />,
            title: 'AI Outfit Matching',
            description: 'Snap a photo and get instant outfit recommendations from in-store inventory.',
            color: '#f093fb'
        },
        {
            icon: <FiSmartphone />,
            title: 'Mobile First',
            description: 'No hardware needed. Uses your phone and existing store WiFi.',
            color: '#10b981'
        },
        {
            icon: <FiTrendingUp />,
            title: 'Smart Analytics',
            description: 'Data-driven insights for personalized shopping recommendations.',
            color: '#f5576c'
        }
    ]

    const stats = [
        { value: '300+', label: 'Retail Outlets', icon: <FiShoppingBag /> },
        { value: '15M+', label: 'Annual Footfalls', icon: <FiUsers /> },
        { value: '90%', label: 'Match Accuracy', icon: <FiCheckCircle /> },
        { value: '10x', label: 'Faster Checkout', icon: <FiZap /> }
    ]

    const steps = [
        { step: '01', title: 'Scan QR Code', description: 'Scan the store QR code at checkout or fitting room' },
        { step: '02', title: 'Join Virtual Queue', description: 'Get your virtual ticket and position in queue' },
        { step: '03', title: 'Shop Freely', description: 'Browse the store while receiving real-time updates' },
        { step: '04', title: 'Get Notified', description: 'Receive alert when its your turn - no waiting!' }
    ]

    const testimonials = [
        {
            quote: "MinuteMax transformed our shopping experience. No more wasted time waiting in lines!",
            author: "Samantha P.",
            role: "Regular Shopper, ODEL",
            rating: 5
        },
        {
            quote: "The AI outfit matching is incredibly accurate. Found perfect combinations I never would have thought of.",
            author: "Ruwan K.",
            role: "Fashion Enthusiast",
            rating: 5
        },
        {
            quote: "Customer satisfaction increased by 40% after implementing MinuteMax in our stores.",
            author: "Nihal F.",
            role: "Store Manager, Nolimit",
            rating: 5
        }
    ]

    return (
        <div className="landing-page" ref={containerRef}>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-image-wrapper">
                    <img src={heroImage} alt="Modern retail store interior" className="hero-image" />
                </div>

                <div className="hero-content container">
                    <motion.div
                        className="hero-text"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <motion.div
                            className="hero-badge"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <FiZap /> Revolutionizing Retail Shopping
                        </motion.div>

                        <h1 className="hero-title">
                            Transform Every
                            <span className="gradient-text"> Wasted Minute </span>
                            Into Joyful Shopping
                        </h1>

                        <p className="hero-subtitle">
                            AI-powered platform that eliminates queues and instantly matches outfits.
                            Turn frustrated shoppers into loyal, higher-spending customers.
                        </p>

                        <motion.div
                            className="hero-buttons"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                        >
                            <Link to="/register" className="btn btn-primary btn-lg">
                                Get Started Free
                                <FiArrowRight />
                            </Link>
                            <Link to="/queue" className="btn btn-secondary btn-lg">
                                Try Virtual Queue
                            </Link>
                        </motion.div>

                        <motion.div
                            className="hero-stats-mini"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            <div className="stat-mini">
                                <strong>300+</strong>
                                <span>Stores</span>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-mini">
                                <strong>15M+</strong>
                                <span>Users</span>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-mini">
                                <strong>4.9★</strong>
                                <span>Rating</span>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                <motion.div
                    className="scroll-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                >
                    <div className="scroll-line" />
                    <span>Scroll to explore</span>
                </motion.div>
            </section>

            {/* Features Section */}
            <FeatureSection features={features} />

            {/* How It Works Section */}
            <HowItWorksSection steps={steps} />

            {/* Stats Section */}
            <StatsSection stats={stats} />

            {/* Testimonials Section */}
            <TestimonialsSection testimonials={testimonials} />

            {/* CTA Section */}
            <CTASection />
        </div>
    )
}

// Feature Section Component
const FeatureSection = ({ features }) => {
    const sectionRef = useRef(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

    return (
        <section className="features-section" ref={sectionRef}>
            <div className="container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    
                    <h2>Everything You Need for <span className="gradient-text">Smart Shopping</span></h2>
                    <p>Revolutionary tools to enhance your retail experience</p>
                </motion.div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="feature-card"
                            initial={{ opacity: 0, y: 50 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -10, transition: { duration: 0.2 } }}
                        >
                            <div
                                className="feature-icon"
                                style={{ background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}40)`, color: feature.color }}
                            >
                                {feature.icon}
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// How It Works Section
const HowItWorksSection = ({ steps }) => {
    const sectionRef = useRef(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

    return (
        <section className="how-it-works-section" ref={sectionRef}>
            <div className="container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    
                    <h2>Four Simple Steps to <span className="gradient-text-accent">Queue-Free</span> Shopping</h2>
                    <p>Join the revolution in just seconds</p>
                </motion.div>

                <div className="steps-container">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            className="step-card"
                            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                            animate={isInView ? { opacity: 1, x: 0 } : {}}
                            transition={{ duration: 0.6, delay: index * 0.15 }}
                        >
                            <div className="step-number">{step.step}</div>
                            <div className="step-content">
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </div>
                            {index < steps.length - 1 && <div className="step-connector" />}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// Stats Section
const StatsSection = ({ stats }) => {
    const sectionRef = useRef(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

    return (
        <section className="stats-section" ref={sectionRef}>
            <div className="stats-bg" />
            <div className="container">
                <div className="stats-grid">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            className="stat-card"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="stat-icon">{stat.icon}</div>
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// Testimonials Section
const TestimonialsSection = ({ testimonials }) => {
    const sectionRef = useRef(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

    return (
        <section className="testimonials-section" ref={sectionRef}>
            <div className="container">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    
                    <h2>Loved by <span className="gradient-text">Shoppers</span> Everywhere</h2>
                    <p>See what our users have to say about MinuteMax</p>
                </motion.div>

                <div className="testimonials-grid">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            className="testimonial-card"
                            initial={{ opacity: 0, y: 50 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <div className="testimonial-rating">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <FiStar key={i} className="star-filled" />
                                ))}
                            </div>
                            <p className="testimonial-quote">"{testimonial.quote}"</p>
                            <div className="testimonial-author">
                                <div className="author-avatar">
                                    {testimonial.author.charAt(0)}
                                </div>
                                <div className="author-info">
                                    <strong>{testimonial.author}</strong>
                                    <span>{testimonial.role}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}

// CTA Section
const CTASection = () => {
    const sectionRef = useRef(null)
    const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

    return (
        <section className="cta-section" ref={sectionRef}>
            <div className="cta-bg" />
            <div className="container">
                <motion.div
                    className="cta-content"
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                >
                    <h2>Ready to Transform Your Shopping Experience?</h2>
                    <p>Join thousands of happy shoppers who never wait in lines again.</p>
                    <div className="cta-buttons">
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Get Started Free
                            <FiArrowRight />
                        </Link>
                        <Link to="/queue" className="btn btn-accent btn-lg">
                            Try Demo
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}

export default LandingPage
