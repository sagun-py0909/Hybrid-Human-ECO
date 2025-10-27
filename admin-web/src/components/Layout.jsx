import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Home, Users, Package, Calendar, FileText, Ticket, Phone, Rocket, Dna, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const menuItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/onboarding', icon: Rocket, label: 'Onboarding' },
    { path: '/dna-collection', icon: Dna, label: 'DNA Collection' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/programs', icon: Calendar, label: 'Programs' },
    { path: '/reports', icon: FileText, label: 'Reports' },
    { path: '/tickets', icon: Ticket, label: 'Tickets' },
    { path: '/call-requests', icon: Phone, label: 'Call Requests' }
  ]

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout()
      navigate('/login')
    }
  }

  const sidebarVariants = {
    expanded: { width: '240px', transition: { duration: 0.3, ease: 'easeInOut' } },
    collapsed: { width: '80px', transition: { duration: 0.3, ease: 'easeInOut' } }
  }

  const labelVariants = {
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
    hidden: { opacity: 0, x: -20, transition: { duration: 0.2 } }
  }

  return (
    <div className="layout">
      {/* Desktop Sidebar */}
      <motion.aside
        className="sidebar"
        variants={sidebarVariants}
        animate={sidebarOpen ? 'expanded' : 'collapsed'}
        initial="expanded"
      >
        <div className="sidebar-header">
          <motion.div 
            className="logo-container"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Rocket className="logo-icon" size={32} />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  className="logo-text"
                  variants={labelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  Hybrid Human
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Menu size={20} />
          </motion.button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <motion.div
                    className="nav-item-content"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="nav-icon" size={20} />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          className="nav-label"
                          variants={labelVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  {isActive && (
                    <motion.div
                      className="active-indicator"
                      layoutId="activeIndicator"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.fullName?.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  className="user-details"
                  variants={labelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <div className="user-name">{user?.fullName}</div>
                  <div className="user-role">Admin</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            className="logout-btn"
            onClick={handleLogout}
            whileHover={{ scale: 1.02, backgroundColor: '#FF6B35' }}
            whileTap={{ scale: 0.98 }}
            title="Logout"
          >
            <LogOut size={20} />
          </motion.button>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="mobile-header">
        <motion.button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          whileTap={{ scale: 0.95 }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
        <h1 className="mobile-title">Hybrid Human</h1>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="mobile-menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              <div className="mobile-menu-header">
                <Rocket className="logo-icon" size={32} />
                <span className="logo-text">Hybrid Human</span>
              </div>
              <nav className="mobile-nav">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
              <button className="mobile-logout" onClick={handleLogout}>
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="main-content">
        <motion.div
          className="content-wrapper"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )
}

export default Layout
