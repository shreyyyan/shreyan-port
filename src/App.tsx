import React, { useEffect, useRef, useState } from 'react';
import { Facebook, Instagram, Github, Linkedin, X } from 'lucide-react';
import { getRoast } from './roast';
import './index.css';
import { supabase } from './lib/supabase';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  link: string;
  image: string;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  const [isAlienActive, setIsAlienActive] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [roast, setRoast] = useState('');
  
  // Real projects from Supabase
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  // Modal state for projects
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [showLoading, setShowLoading] = useState(true);
  const [fadeText, setFadeText] = useState(false);
  const [fadeBg, setFadeBg] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setFadeText(true);
    }, 1500);
    
    const t2 = setTimeout(() => {
      setFadeBg(true);
    }, 2000);
    
    const t3 = setTimeout(() => {
      setShowLoading(false);
    }, 3000);
    
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const nameInputRef = useRef<HTMLSpanElement>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const roastDisappearTimer = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements[0] as HTMLInputElement).value;
    const email = (form.elements[1] as HTMLInputElement).value;
    const message = (form.elements[2] as HTMLTextAreaElement).value;
    const submitBtn = form.elements[3] as HTMLButtonElement;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Sending...';

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      toast.error("EmailJS is not configured in .env file");
      submitBtn.disabled = false;
      submitBtn.innerText = 'Send Message';
      return;
    }

    emailjs.send(
      serviceId,
      templateId,
      {
        from_name: name,
        from_email: email,
        message: message,
      },
      publicKey
    ).then(() => {
      toast.success("Message sent successfully!");
      form.reset();
    }).catch((err) => {
      toast.error("Failed to send message.");
      console.error(err);
    }).finally(() => {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Send Message';
    });
  };

  // --- Fetch Projects from Supabase ---
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          setProjects(data.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            tags: p.tags ? p.tags.split(',').map((t: string) => t.trim()) : [],
            link: p.link,
            image: p.image_url
          })));
        }
      } catch (err) {
        console.warn('Failed to fetch projects from Supabase:', err);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();

    // Subscribe to real-time changes
    let channel: any;
    if (import.meta.env.VITE_SUPABASE_URL) {
      channel = supabase.channel('public:projects')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
          fetchProjects();
        })
        .subscribe();
    }
      
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // --- Handle Custom Cursor ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // --- Smart Scroll Navbar Logic ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Universe Canvas Logic ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    let distantStars: any[] = [];

    const mouseCoords: { x: number | null, y: number | null, radius: number } = { x: null, y: null, radius: 150 };

    const handleMouseMove = (event: MouseEvent) => {
      mouseCoords.x = event.clientX;
      mouseCoords.y = event.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    class Particle {
        x: number; y: number; dirX: number; dirY: number; size: number; color: string; baseSize: number; pulseFactor: number;
        constructor(x: number, y: number, dirX: number, dirY: number, size: number, color: string) {
            this.x = x; this.y = y; this.dirX = dirX; this.dirY = dirY;
            this.size = size; this.color = color; this.baseSize = size;
            this.pulseFactor = Math.random() * 0.002 + 0.001;
        }
        draw() {
            ctx!.beginPath();
            ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx!.fillStyle = this.color;
            ctx!.fill();
        }
        update() {
            if (this.x > canvas!.width || this.x < 0) this.dirX = -this.dirX;
            if (this.y > canvas!.height || this.y < 0) this.dirY = -this.dirY;
            this.x += this.dirX; this.y += this.dirY;
            this.size = this.baseSize + Math.sin(Date.now() * this.pulseFactor) * 0.5;
            this.draw();
        }
    }
    
    class DistantStar {
        baseRadius: number; radius: number; x: number; y: number; velocity: { x: number, y: number }; color: string; pulseFactor: number;
        constructor() {
            this.baseRadius = Math.random() * 2.5 + 1;
            this.radius = this.baseRadius;
            this.x = Math.random() * canvas!.width;
            this.y = Math.random() * canvas!.height;
            this.velocity = { x: (Math.random() - 0.5) * 0.05, y: (Math.random() - 0.5) * 0.05 };
            this.color = `rgba(0,0,0,${Math.random() * 0.4 + 0.1})`;
            this.pulseFactor = Math.random() * 0.001;
        }
        draw() {
            ctx!.beginPath();
            ctx!.arc(this.x, this.y, Math.abs(this.radius), 0, Math.PI * 2);
            ctx!.fillStyle = this.color;
            ctx!.fill();
        }
        update() {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.radius = this.baseRadius + Math.sin(Date.now() * this.pulseFactor) * 0.2;
            if (this.x < -this.radius) this.x = canvas!.width + this.radius;
            if (this.x > canvas!.width + this.radius) this.x = -this.radius;
            if (this.y < -this.radius) this.y = canvas!.height + this.radius;
            if (this.y > canvas!.height + this.radius) this.y = -this.radius;
            this.draw();
        }
    }
    
    function connectParticles() {
        for (let a = 0; a < particles.length; a++) {
            let distanceToMouse = Math.hypot(particles[a].x - (mouseCoords.x as number), particles[a].y - (mouseCoords.y as number));
            if (distanceToMouse < mouseCoords.radius && mouseCoords.x !== null) {
                ctx!.strokeStyle = `rgba(0,0,0,${0.8 - distanceToMouse / mouseCoords.radius})`;
                ctx!.lineWidth = 1.5;
                ctx!.beginPath();
                ctx!.moveTo(mouseCoords.x, mouseCoords.y as number);
                ctx!.lineTo(particles[a].x, particles[a].y);
                ctx!.stroke();
            }
            for (let b = a; b < particles.length; b++) {
                let distance = Math.hypot(particles[a].x - particles[b].x, particles[a].y - particles[b].y);
                if (distance < 120) {
                    ctx!.strokeStyle = `rgba(0,0,0,${0.6 - distance / 120})`;
                    ctx!.lineWidth = 1.2;
                    ctx!.beginPath();
                    ctx!.moveTo(particles[a].x, particles[a].y);
                    ctx!.lineTo(particles[b].x, particles[b].y);
                    ctx!.lineTo(particles[b].x, particles[b].y);
                    ctx!.stroke();
                }
            }
        }
    }

    function animateUniverse() {
        if (!canvas || !ctx) return;
        animationFrameId = requestAnimationFrame(animateUniverse);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        distantStars.forEach(obj => obj.update());
        particles.forEach(p => p.update());
        connectParticles();
    }

    function initUniverse() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];
        distantStars = [];
        let particleCount = (canvas.width * canvas.height) / 9000;
        for (let i = 0; i < particleCount; i++) {
            let size = Math.random() * 2.5 + 1;
            let x = Math.random() * window.innerWidth; let y = Math.random() * window.innerHeight;
            let dirX = (Math.random() * 1.5) - 0.75; let dirY = (Math.random() * 1.5) - 0.75;
            particles.push(new Particle(x, y, dirX, dirY, size, 'rgba(0,0,0,0.8)'));
        }
        for (let i = 0; i < 70; i++) {
            distantStars.push(new DistantStar());
        }
    }

    const handleResize = () => {
      initUniverse();
    };

    window.addEventListener('resize', handleResize);
    initUniverse();
    animateUniverse();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // --- Logic for Timers & Roast Box ---
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isAlienActive && step === 1) {
      inactivityTimer.current = setTimeout(closeRoastBox, 10000);
    }
  };

  const closeRoastBox = () => {
    setIsAlienActive(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (roastDisappearTimer.current) clearTimeout(roastDisappearTimer.current);
    if (nameInputRef.current) nameInputRef.current.innerText = '';
    setStep(1);
  };

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [isAlienActive, step]);

  useEffect(() => {
    const handleGlobalAction = () => {
      if (isAlienActive && step === 1) {
        resetInactivityTimer();
      }
    };
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleGlobalAction));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleGlobalAction));
    };
  }, [isAlienActive, step]);

  const toggleRoastBox = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAlienActive((prev) => !prev);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    closeRoastBox();
  };

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const nameVal = nameInputRef.current?.innerText.trim();
    if (!nameVal) {
      if (nameInputRef.current) {
        nameInputRef.current.innerText = '';
        nameInputRef.current.focus();
      }
      return;
    }

    setStep(2);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

    try {
      const roastText = await getRoast(nameVal);
      setRoast(roastText);
    } catch (err) {
      setRoast('Sorry, the roast machine is broken. Try again later.');
    } finally {
      setStep(3);
      if (roastDisappearTimer.current) clearTimeout(roastDisappearTimer.current);
      roastDisappearTimer.current = setTimeout(() => {
        closeRoastBox();
      }, 15000);
    }
  };

  const handleRestart = () => {
    if (roastDisappearTimer.current) clearTimeout(roastDisappearTimer.current);
    if (nameInputRef.current) nameInputRef.current.innerText = '';
    setStep(1);
    resetInactivityTimer();
  };

  return (
    <>
      {showLoading && (
        <div className={`initial-loader ${fadeBg ? 'fading' : ''}`}>
          <h1 className={fadeText ? 'fading-text' : ''}>#shreyandahal</h1>
        </div>
      )}
      <div className="custom-cursor" ref={cursorRef}></div>
      <canvas id="universe-canvas" ref={canvasRef}></canvas>

      {/* Main Scrollable Layout Wrapper */}
      <div className="relative z-10 w-full text-[#1a1a1a]" onClick={handleContainerClick}>
        
        {/* HERO SECTION */}
        <section id="home" className="min-h-screen flex flex-col justify-center items-center text-center px-4 relative">
          <h1 className="font-['Dancing_Script'] text-[clamp(5rem,12vw,10rem)] font-bold text-[#1a1a1a] drop-shadow-md pointer-events-auto tracking-wide">
            Shreyan Dahal
          </h1>
          <div className="flex gap-4 mt-10 pointer-events-auto">
             <button onClick={() => document.getElementById('contact')?.scrollIntoView({behavior: 'smooth'})} className="bg-white/60 backdrop-blur-md border border-gray-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all text-[#1a1a1a] px-5 py-2 text-[10px] rounded-full font-bold tracking-wider uppercase">Hire Me</button>
             <button onClick={async () => {
               try {
                 const response = await fetch('/Shreyan-CV.pdf');
                 if (!response.ok) throw new Error('File not found');
                 const blob = await response.blob();
                 const url = window.URL.createObjectURL(blob);
                 const link = document.createElement('a');
                 link.href = url;
                 link.download = 'Shreyan-CV.pdf';
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
                 window.URL.revokeObjectURL(url);
               } catch (error) {
                 console.error('Download failed:', error);
                 toast.error('Failed to download CV');
               }
             }} className="bg-white/60 backdrop-blur-md border border-gray-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all text-[#1a1a1a] px-5 py-2 text-[10px] rounded-full font-bold tracking-wider uppercase">Download CV</button>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section id="about" className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative pointer-events-auto">
          <div className="glass-panel max-w-4xl w-full p-8 md:p-12 text-center">
            <h2 className="text-4xl font-bold mb-6 font-['Shadows_Into_Light'] text-blue-700">About me</h2>
            <p className="text-lg leading-relaxed opacity-80 text-[#1a1a1a]">
              Hey, I'm Shreyan. If it involves computers, I’m usually interested. I’m currently navigating my way through a CSIT degree, but my real learning happens when I'm experimenting on my own. I like the challenge of web development, the logic of AI APIs, and the puzzle-solving nature of cybersecurity. I’ve already put these interests to work by launching my own AI web app and handling real-world community growth online. I’m still figuring out my exact niche, but I love exploring new tech, breaking things down to understand them, and building functional projects as I go.
            </p>
          </div>
        </section>

        {/* PROJECTS SECTION */}
        <section id="projects" className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative pointer-events-auto">
          <h2 className="text-4xl font-bold mb-10 font-['Shadows_Into_Light'] text-blue-700">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full">
            {isLoadingProjects ? (
              <div className="col-span-full text-center opacity-60">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="col-span-full text-center opacity-60">No projects to show yet. Check back later!</div>
            ) : (
              projects.map(p => (
                <div 
                  key={p.id} 
                  className="glass-card flex flex-col overflow-hidden cursor-pointer bg-white/40 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                  onClick={() => setSelectedProject(p)}
                >
                  <img src={p.image} alt={p.title} className="w-full h-48 object-cover opacity-80 hover:opacity-100 transition-opacity" />
                  <div className="p-6 flex flex-col flex-grow">
                     <h3 className="text-2xl font-bold mb-2 text-[#1a1a1a]">{p.title}</h3>
                     <p className="flex-grow opacity-80 mb-4 text-[#1a1a1a] line-clamp-3">{p.description}</p>
                     <div className="flex flex-wrap gap-2 mb-4">
                       {p.tags.map(t => <span key={t} className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-800 border border-blue-200">{t}</span>)}
                     </div>
                     <button className="text-blue-700 font-bold hover:text-blue-500 transition-colors self-start">View project &rarr;</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative pointer-events-auto">
          <div className="glass-panel max-w-5xl w-full p-8 md:p-12">
            <h2 className="text-4xl font-bold mb-10 font-['Shadows_Into_Light'] text-blue-700 text-center">Let's connect</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* Left: Socials */}
               <div className="flex flex-col justify-center gap-6">
                 <h3 className="text-2xl font-bold mb-4 text-[#1a1a1a]">Find me online</h3>
                 <div className="flex flex-col gap-6">
                    <a href="https://www.facebook.com/shreyyyan" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group font-medium opacity-80 hover:opacity-100 text-[#1a1a1a] transition-opacity">
                      <Facebook size={28} className="text-[#1a1a1a] group-hover:text-[#1877F2] transition-colors" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1a1a1a] to-[#1a1a1a] group-hover:from-[#1877F2] group-hover:to-[#0056b3] transition-colors duration-300">Facebook</span>
                    </a>
                    <a href="https://www.instagram.com/_shreyyyan/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group font-medium opacity-80 hover:opacity-100 text-[#1a1a1a] transition-all">
                      <Instagram size={28} className="text-[#1a1a1a] group-hover:text-[#E1306C] transition-colors" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1a1a1a] to-[#1a1a1a] group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] transition-colors duration-300">Instagram</span>
                    </a>
                    <a href="https://github.com/shreyyyan" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group font-medium opacity-80 hover:opacity-100 text-[#1a1a1a] transition-all">
                      <Github size={28} className="text-[#1a1a1a] group-hover:text-[#171515] transition-colors" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1a1a1a] to-[#1a1a1a] group-hover:from-[#171515] group-hover:to-[#0f4d1f] transition-colors duration-300">GitHub</span>
                    </a>
                    <a href="https://www.linkedin.com/in/shreyan-dahal-6a88b2329/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group font-medium opacity-80 hover:opacity-100 text-[#1a1a1a] transition-opacity">
                      <Linkedin size={28} className="text-[#1a1a1a] group-hover:text-[#0A66C2] transition-colors" />
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1a1a1a] to-[#1a1a1a] group-hover:from-[#0A66C2] group-hover:to-[#004182] transition-colors duration-300">LinkedIn</span>
                    </a>
                 </div>
               </div>
               {/* Right: Form */}
               <div className="flex flex-col">
                 <form onSubmit={handleContactSubmit} className="flex flex-col gap-5 h-full justify-between">
                    <input type="text" required className="glass-input p-4 rounded-xl text-[#1a1a1a] placeholder-gray-500" placeholder="Your Name" />
                    <input type="email" required className="glass-input p-4 rounded-xl text-[#1a1a1a] placeholder-gray-500" placeholder="your@email.com" />
                    <textarea required rows={5} className="glass-input p-4 rounded-xl resize-none text-[#1a1a1a] placeholder-gray-500" placeholder="What's on your mind?"></textarea>
                    <button type="submit" className="glass-btn w-full py-4 text-[#1a1a1a] font-bold bg-white/60 hover:bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all mt-auto border border-gray-300 rounded-full">Send Message</button>
                 </form>
               </div>
            </div>
          </div>
        </section>

      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-auto">
           {/* Backdrop */}
           <div className="absolute inset-0 bg-black/80" onClick={() => setSelectedProject(null)}></div>
           {/* Modal Content */}
           <div className="bg-[#FDFDFB] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-10 flex flex-col md:flex-row shadow-2xl border border-gray-200">
              <button onClick={() => setSelectedProject(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 rounded-full p-2 transition text-white/70 hover:text-white z-20">
                <X size={24} />
              </button>
              <div className="md:w-1/2">
                <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none min-h-[300px]" />
              </div>
              <div className="p-8 md:w-1/2 flex flex-col justify-center bg-[#FDFDFB] rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none">
                <h3 className="text-3xl font-bold mb-4 text-[#1a1a1a]">{selectedProject.title}</h3>
                <p className="text-[#1a1a1a] opacity-80 leading-relaxed mb-6">{selectedProject.description}</p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {selectedProject.tags.map(t => <span key={t} className="text-sm font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">{t}</span>)}
                </div>
                <div className="mt-auto">
                  <a href={selectedProject.link} target="_blank" rel="noopener noreferrer" className="glass-btn inline-block px-8 py-3 text-[#1a1a1a]">Visit Project</a>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Dock Navigation */}
      <nav className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] glass-dock px-6 py-3 rounded-full flex gap-8 items-center pointer-events-auto ${showNav ? '' : 'nav-hidden'}`}>
         <div className="dock-item" onClick={() => document.getElementById('home')?.scrollIntoView({behavior: 'smooth'})}>
           <img src="https://i.ibb.co/yF1FTwrH/home.png" alt="Home" className="w-6 h-6 object-contain" style={{ filter: 'brightness(0)' }} />
           <span className="dock-tooltip">Home</span>
         </div>
         <div className="dock-item" onClick={() => document.getElementById('about')?.scrollIntoView({behavior: 'smooth'})}>
           <img src="https://i.ibb.co/LzhTNzhF/information.png" alt="About" className="w-6 h-6 object-contain" style={{ filter: 'brightness(0)' }} />
           <span className="dock-tooltip">About Me</span>
         </div>
         <div className="dock-item" onClick={() => document.getElementById('projects')?.scrollIntoView({behavior: 'smooth'})}>
           <img src="https://i.ibb.co/wZnxpn8G/project.png" alt="Projects" className="w-6 h-6 object-contain" style={{ filter: 'brightness(0)' }} />
           <span className="dock-tooltip">Projects</span>
         </div>
         <div className="dock-item" onClick={() => document.getElementById('contact')?.scrollIntoView({behavior: 'smooth'})}>
           <img src="https://i.ibb.co/hRHFySNy/email.png" alt="Contact" className="w-6 h-6 object-contain" style={{ filter: 'brightness(0)' }} />
           <span className="dock-tooltip">Contact</span>
         </div>
      </nav>

      <div
        className={`alien-bot-container ${isAlienActive ? 'active' : ''}`}
        id="alien-bot"
        onClick={toggleRoastBox}
      >
        <div className="alien-character">
          <div className="alien-label">Roast Me!</div>
          <img
            id="alien-img"
            src="https://media.giphy.com/media/3o7aD2d7hy9ktXNDP2/giphy.gif"
            alt="Animated Alien Character"
          />
        </div>
      </div>

      {/* Roast Me Notebook Form */}
      <div
        className={`roast-box-container ${isAlienActive ? 'visible' : ''}`}
        id="roast-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notebook-wrapper">
          <button
            type="button"
            id="close-roast-box"
            className="close-button"
            onClick={closeRoastBox}
          >
            &times;
          </button>
          <div className="notebook-edge"></div>
          <form
            className="form__contact"
            id="roast-form"
            onSubmit={handleSubmit}
          >
            <fieldset>
              <div
                id="step-1-input"
                className={`step ${step !== 1 ? 'hidden' : ''}`}
              >
                <p className="form-question">What's your name?</p>
                <p>
                  <span
                    id="name-input"
                    className="form__field"
                    data-placeholder="Enter name"
                    tabIndex={1}
                    contentEditable
                    ref={nameInputRef}
                    onInput={resetInactivityTimer}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  ></span>
                </p>
                <button id="submit-button" type="submit" tabIndex={2}>
                  Get Roasted &#187;
                </button>
              </div>

              <div
                id="step-2-loader"
                className={`step step-centered ${step !== 2 ? 'hidden' : ''}`}
              >
                <div className="loader">
                  <svg className="spinner" viewBox="0 0 50 50">
                    <circle
                      className="path"
                      cx="25"
                      cy="25"
                      r="20"
                      fill="none"
                      strokeWidth="5"
                    ></circle>
                  </svg>
                  ANALYZING...
                </div>
              </div>

              <div
                id="step-3-result"
                className={`step step-centered ${step !== 3 ? 'hidden' : ''}`}
              >
                <div id="result-text" className="result-container">
                  {roast}
                </div>
                <button id="restart-button" type="button" onClick={handleRestart}>
                  &#187;
                </button>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </>
  );
}
