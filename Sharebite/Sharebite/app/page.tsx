'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeStorage, getUserByEmail, setCurrentUser } from '@/lib/storage';
import { User } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [foodItems, setFoodItems] = useState<string[]>(['']);
  const [recipe, setRecipe] = useState<string>('');
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState('');

  useEffect(() => {
    initializeStorage();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
      setError('Invalid email or password');
      return;
    }

    setCurrentUser(user);
    
    // Redirect based on role
    if (user.role === 'admin') {
      router.push('/admin');
    } else if (user.role === 'ngo') {
      router.push('/ngo');
    } else {
      router.push('/restaurant');
    }
  };

  const quickLogin = (testEmail: string, testPassword: string) => {
    setEmail(testEmail);
    setPassword(testPassword);
    const user = getUserByEmail(testEmail);
    if (user && user.password === testPassword) {
      setCurrentUser(user);
      if (user.role === 'admin') {
        router.push('/admin');
      } else if (user.role === 'ngo') {
        router.push('/ngo');
      } else {
        router.push('/restaurant');
      }
    }
  };

  const addFoodItem = () => {
    setFoodItems([...foodItems, '']);
  };

  const removeFoodItem = (index: number) => {
    if (foodItems.length > 1) {
      setFoodItems(foodItems.filter((_, i) => i !== index));
    }
  };

  const updateFoodItem = (index: number, value: string) => {
    const updated = [...foodItems];
    updated[index] = value;
    setFoodItems(updated);
  };

  // Function to format recipe text (parse markdown-like formatting)
  const formatRecipeText = (text: string): string => {
    let formatted = text;
    
    // First, handle bold text **text** (do this first to avoid conflicts)
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    
    // Then handle italic text *text* (only if not preceded or followed by *)
    // Use a simpler approach: match single * that's not part of **
    formatted = formatted.replace(/([^*]|^)\*([^*\n]+?)\*([^*]|$)/g, '$1<em class="italic">$2</em>$3');
    
    // Convert headers
    formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold mt-6 mb-3 text-gray-900">$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-gray-900">$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 text-gray-900">$1</h1>');
    
    // Split into lines for processing
    const lines = formatted.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listType: 'ol' | 'ul' | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check for numbered list (1. item)
      const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      // Check for bullet list (- or •)
      const bulletMatch = trimmedLine.match(/^[-•]\s+(.+)$/);
      
      if (numberedMatch) {
        if (!inList || listType !== 'ol') {
          if (inList && listType === 'ul') {
            processedLines.push('</ul>');
          }
          processedLines.push('<ol class="list-decimal ml-6 mb-3 space-y-1">');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li class="mb-1">${numberedMatch[2]}</li>`);
      } else if (bulletMatch) {
        if (!inList || listType !== 'ul') {
          if (inList && listType === 'ol') {
            processedLines.push('</ol>');
          }
          processedLines.push('<ul class="list-disc ml-6 mb-3 space-y-1">');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li class="mb-1">${bulletMatch[1]}</li>`);
      } else {
        // Close any open list
        if (inList) {
          processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
          inList = false;
          listType = null;
        }
        
        // Process regular lines
        if (trimmedLine === '') {
          processedLines.push('<br>');
        } else if (trimmedLine.startsWith('<')) {
          // Already formatted (headers, etc.)
          processedLines.push(line);
        } else {
          // Regular paragraph text
          processedLines.push(`<p class="mb-3">${line}</p>`);
        }
      }
    }
    
    // Close any remaining open list
    if (inList) {
      processedLines.push(listType === 'ol' ? '</ol>' : '</ul>');
    }
    
    return processedLines.join('\n');
  };

  const handleGetRecipe = async () => {
    const validItems = foodItems.filter(item => item.trim() !== '');
    if (validItems.length === 0) {
      setRecipeError('Please enter at least one food item');
      return;
    }

    setLoadingRecipe(true);
    setRecipeError('');
    setRecipe('');

    try {
      const response = await fetch('/api/recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ foodItems: validItems }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recipe');
      }

      setRecipe(data.recipe);
    } catch (error: any) {
      setRecipeError(error.message || 'Failed to generate recipe. Please try again.');
    } finally {
      setLoadingRecipe(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 overflow-hidden">
                <img 
                  src="https://images.vexels.com/media/users/3/254185/isolated/preview/bdb081449443b1729a9d10b0e96d7a08-happy-bread-food-character-cartoon.png" 
                  alt="ShareBite Logo" 
                  className="w-full h-full object-contain object-left"
                  style={{ width: '125%', marginLeft: '0%' }}
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                ShareBite
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowRecipeModal(true)}
                className="px-4 py-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Recipe Helper
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,300 Q300,100 600,300 T1200,300" stroke="currentColor" strokeWidth="2" fill="none" className="text-emerald-500"/>
            <path d="M0,200 Q400,400 800,200 T1600,200" stroke="currentColor" strokeWidth="2" fill="none" className="text-teal-500"/>
          </svg>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-6">
                🌱 Fighting Food Waste, One Meal at a Time
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Transform Food Waste
                </span>
                <br />
                <span className="text-gray-900">Into Hope</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                ShareBite connects restaurants, NGOs, and communities to reduce food waste and feed those in need. 
                Powered by AI to make smarter, more impactful decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  Get Started
                </button>
                <button
                  onClick={() => {
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-white text-emerald-600 rounded-xl hover:bg-gray-50 transition-all font-semibold text-lg shadow-md border-2 border-emerald-600"
                >
                  Learn More
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop" 
                  alt="Food sharing" 
                  className="rounded-3xl shadow-2xl"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-emerald-200 rounded-full opacity-50 blur-2xl"></div>
              <div className="absolute -top-6 -right-6 w-40 h-40 bg-teal-200 rounded-full opacity-50 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              The Challenge We Face
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Food waste is a global crisis with far-reaching consequences
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-red-50 rounded-2xl p-8 border-l-4 border-red-500">
              <div className="text-5xl mb-4">🍽️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">1.3 Billion Tons</h3>
              <p className="text-gray-600 leading-relaxed">
                Of food is wasted globally each year, enough to feed 3 billion people
              </p>
            </div>
            
            <div className="bg-orange-50 rounded-2xl p-8 border-l-4 border-orange-500">
              <div className="text-5xl mb-4">💸</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">$1 Trillion</h3>
              <p className="text-gray-600 leading-relaxed">
                In economic losses annually due to food waste, affecting businesses and economies worldwide
              </p>
            </div>
            
            <div className="bg-amber-50 rounded-2xl p-8 border-l-4 border-amber-500">
              <div className="text-5xl mb-4">🌍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">8% of Emissions</h3>
              <p className="text-gray-600 leading-relaxed">
                Food waste contributes to 8% of global greenhouse gas emissions, accelerating climate change
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=600&fit=crop" 
                alt="Community food sharing" 
                className="rounded-3xl shadow-xl"
              />
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                ShareBite was born from a simple yet powerful idea: what if we could turn every piece of surplus food 
                into an opportunity to help someone in need?
              </p>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                We've created a comprehensive platform that uses artificial intelligence to predict food expiration, 
                assess waste risk, and connect restaurants with local NGOs seamlessly. Our goal is to create a world 
                where no good food goes to waste, and no one goes hungry.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-700">AI-powered predictions for smarter food management</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-700">Real-time connections between restaurants and NGOs</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-gray-700">Comprehensive analytics to track your impact</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Making a Real Impact
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Together, we're creating measurable change in communities worldwide
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 shadow-lg">
              <div className="text-5xl font-bold text-emerald-600 mb-2">10K+</div>
              <div className="text-gray-700 font-semibold text-lg">Meals Donated</div>
              <div className="text-gray-500 text-sm mt-2">And counting</div>
            </div>
            
            <div className="text-center bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 shadow-lg">
              <div className="text-5xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-700 font-semibold text-lg">Restaurants</div>
              <div className="text-gray-500 text-sm mt-2">Actively participating</div>
            </div>
            
            <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg">
              <div className="text-5xl font-bold text-purple-600 mb-2">50+</div>
              <div className="text-gray-700 font-semibold text-lg">NGO Partners</div>
              <div className="text-gray-500 text-sm mt-2">Serving communities</div>
            </div>
            
            <div className="text-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 shadow-lg">
              <div className="text-5xl font-bold text-amber-600 mb-2">25K+</div>
              <div className="text-gray-700 font-semibold text-lg">Kg Waste Saved</div>
              <div className="text-gray-500 text-sm mt-2">From landfills</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-12 text-white shadow-2xl">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">62.5K</div>
                <div className="text-emerald-100">Kg CO₂ Reduced</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">5,000+</div>
                <div className="text-emerald-100">People Fed</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">$50K+</div>
                <div className="text-emerald-100">Economic Value Created</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose ShareBite?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to make food waste management effortless
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI-Powered Predictions</h3>
              <p className="text-gray-600 leading-relaxed">
                Advanced machine learning models predict expiration dates, waste risk, and optimal donation timing 
                to maximize impact and minimize waste.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Seamless Connections</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect restaurants directly with local NGOs. Real-time notifications ensure food reaches those 
                in need quickly and efficiently.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Track Impact</h3>
              <p className="text-gray-600 leading-relaxed">
                Comprehensive analytics show your contribution to reducing food waste, helping communities, 
                and making a positive environmental impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join hundreds of restaurants and NGOs working together to reduce food waste and feed communities.
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="px-10 py-4 bg-white text-emerald-600 rounded-xl hover:bg-gray-50 transition-all font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
          >
            Get Started Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-20 h-20 overflow-hidden">
                <img 
                  src="https://images.vexels.com/media/users/3/254185/isolated/preview/bdb081449443b1729a9d10b0e96d7a08-happy-bread-food-character-cartoon.png" 
                  alt="ShareBite Logo" 
                  className="w-full h-full object-contain object-left"
                  style={{ width: '125%', marginLeft: '0%' }}
                />
              </div>
              <span className="text-xl font-bold text-white">ShareBite</span>
            </div>
            <p className="text-gray-400">Transforming Food Waste into Hope</p>
            <p className="text-gray-500 text-sm mt-4">© 2024 ShareBite. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setError('');
                  setEmail('');
                  setPassword('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-900 placeholder-gray-400"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-900 placeholder-gray-400"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-semibold shadow-medium hover:shadow-strong transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-4 text-center">Quick Login (Test Accounts):</p>
              <div className="space-y-2">
                <button
                  onClick={() => quickLogin('admin@sharebite.com', 'admin123')}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl text-sm transition-all border border-gray-200 hover:border-gray-300"
                >
                  <span className="font-semibold text-emerald-600">Admin:</span> <span className="text-gray-700">admin@sharebite.com</span>
                </button>
                <button
                  onClick={() => quickLogin('ngo1@sharebite.com', 'ngo123')}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl text-sm transition-all border border-gray-200 hover:border-gray-300"
                >
                  <span className="font-semibold text-blue-600">NGO 1:</span> <span className="text-gray-700">ngo1@sharebite.com</span>
                </button>
                <button
                  onClick={() => quickLogin('ngo2@sharebite.com', 'ngo123')}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl text-sm transition-all border border-gray-200 hover:border-gray-300"
                >
                  <span className="font-semibold text-blue-600">NGO 2:</span> <span className="text-gray-700">ngo2@sharebite.com</span>
                </button>
                <button
                  onClick={() => quickLogin('restaurant1@sharebite.com', 'rest123')}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl text-sm transition-all border border-gray-200 hover:border-gray-300"
                >
                  <span className="font-semibold text-emerald-600">Restaurant 1:</span> <span className="text-gray-700">restaurant1@sharebite.com</span>
                </button>
                <button
                  onClick={() => quickLogin('restaurant2@sharebite.com', 'rest123')}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl text-sm transition-all border border-gray-200 hover:border-gray-300"
                >
                  <span className="font-semibold text-emerald-600">Restaurant 2:</span> <span className="text-gray-700">restaurant2@sharebite.com</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl border border-gray-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Recipe Helper</h2>
              <button
                onClick={() => {
                  setShowRecipeModal(false);
                  setFoodItems(['']);
                  setRecipe('');
                  setRecipeError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Enter the food items you have in your fridge, and our AI will suggest a delicious recipe!
              </p>
              
              <div className="space-y-3 mb-4">
                {foodItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateFoodItem(index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-gray-900 placeholder-gray-400"
                      placeholder={`Food item ${index + 1} (e.g., tomatoes, chicken, pasta)`}
                    />
                    {foodItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFoodItem(index)}
                        className="px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFoodItem}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold mb-4"
              >
                + Add Another Item
              </button>

              <button
                onClick={handleGetRecipe}
                disabled={loadingRecipe}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 px-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-semibold shadow-medium hover:shadow-strong disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingRecipe ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Recipe...
                  </span>
                ) : (
                  'Get Recipe Suggestion'
                )}
              </button>

              {recipeError && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                  {recipeError}
                </div>
              )}
            </div>

            {recipe && (
              <div className="mt-6 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Suggested Recipe</h3>
                <div 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatRecipeText(recipe) }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
