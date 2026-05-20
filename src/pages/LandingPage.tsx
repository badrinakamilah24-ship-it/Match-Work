import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Brain, Zap, Clock, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user]);

  if (user) return null;

  return (
    <div className="relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50 to-transparent -z-10" />
      <div className="absolute top-40 left-[20%] w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute top-60 right-[20%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl -z-10 animate-pulse delay-700" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 mb-8">
              <Sparkles className="w-4 h-4 mr-2" />
              The Future of Job Matching is Here
            </span>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-gray-900 mb-6 transition-all">
              Find Your <span className="text-indigo-600">Perfect Match</span> <br />
              With AI Intelligence
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
              Match Work connects talent with innovative companies through smart AI matching. 
              No more endless scrolling, just meaningful career connections.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/register?role=seeker"
                className="group w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center shadow-xl shadow-indigo-100"
              >
                Find Jobs (Seeker)
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/register?role=recruiter"
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 rounded-full font-semibold border border-gray-200 hover:bg-gray-50 transition-all shadow-sm"
              >
                Hire Talent (Recruiter)
              </Link>
            </div>
          </motion.div>

          {/* App Mockup Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative max-w-4xl mx-auto"
          >
            <div className="aspect-[16/9] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden">
               <div className="w-full h-full bg-gray-50 rounded-xl flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="text-indigo-600 w-12 h-12" />
                    </div>
                    <p className="text-gray-400 font-medium">Interactive Demo Explorer</p>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">Why Match Work?</h2>
            <p className="text-gray-600 max-w-xl mx-auto">We've automated the boring parts of recruitment so you can focus on what matters.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Brain className="w-6 h-6 text-indigo-600" />}
              title="Smart AI Matching"
              description="Our proprietary algorithm matches skills, personality, and culture with 95% accuracy."
            />
            <FeatureCard 
              icon={<Sparkles className="w-6 h-6 text-indigo-600" />}
              title="AI Resume Analyzer"
              description="Get instant feedback on your CV and discover exactly which skills you need to land your dream job."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-indigo-600" />}
              title="Instant Connections"
              description="Direct chat between candidates and recruiters. No recruitment black holes."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-indigo-100 transition-colors group">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
