'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/planner', label: 'Timeline' },
  { href: '/time-tracking', label: 'Time Tracking' },
  { href: '/financial', label: 'Financial' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav style={{
      borderBottom: '1px solid #1a1a1a',
      backgroundColor: '#111',
      padding: '0 2rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/dashboard" style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}>
            <Image
              src="https://clickk.com.au/wp-content/uploads/2024/09/Primary-Logo-Colour-768x170.webp"
              alt="Clickk Logo"
              width={120}
              height={27}
              style={{ objectFit: 'contain' }}
              unoptimized
            />
          </Link>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '0.5rem 0',
                  color: pathname === item.href ? '#A8E1FF' : '#ccc',
                  textDecoration: 'none',
                  fontWeight: pathname === item.href ? 600 : 400,
                  borderBottom: pathname === item.href ? '2px solid #A8E1FF' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              border: '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#ccc',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FF3388';
              e.currentTarget.style.color = '#FF3388';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#444';
              e.currentTarget.style.color = '#ccc';
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

