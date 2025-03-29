import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/router';

// Import LoginForm with no SSR
const LoginForm = dynamic(() => import('@/components/LoginForm'), {
  ssr: false,
});

export default function Login() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/');
    }
  }, [router]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Login - FlyNext</title>
        <meta name="description" content="Login to your FlyNext account" />
      </Head>

      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Left side - Login form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8">
          <LoginForm />
        </div>

        {/* Right side - Image */}
        <div className="hidden md:block md:w-1/2 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-90 z-10"></div>
          <div className="absolute inset-0">
            <Image
              src="/hero-bg.jpg"
              alt="Travel background"
              layout="fill"
              objectFit="cover"
              priority
            />
          </div>
        </div>
      </div>
    </>
  );
}