import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import { supabase } from './lib/supabase';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  tags: string;
  link: string;
  imageUrl: string;
}

export default function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [authError, setAuthError] = useState('');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [formData, setFormData] = useState<Project>({
    id: '',
    title: '',
    description: '',
    tags: '',
    link: '',
    imageUrl: ''
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
        fetchProjects();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsLoggedIn(true);
        fetchProjects();
      } else {
        setIsLoggedIn(false);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        // Map Supabase columns (like image_url) to frontend model (imageUrl)
        const mapped = data.map(p => ({
          ...p,
          imageUrl: p.image_url
        }));
        setProjects(mapped);
      }
    } catch (err) {
      console.warn('Failed to fetch projects:', err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Background and Custom Cursor Setup
  useEffect(() => {
    // Custom Cursor
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = e.clientX + 'px';
        cursorRef.current.style.top = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);

    // Universe Canvas
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

    const handleMouseOut = () => {
      mouseCoords.x = null;
      mouseCoords.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseOut);

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
            this.velocity = { x: (Math.random() - 0.5) * 0.15, y: (Math.random() - 0.5) * 0.15 };
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
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from('projects').update({
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
        link: formData.link,
        image_url: formData.imageUrl
      }).eq('id', editingId);
      
      if (!error) {
        setProjects(projects.map(p => p.id === editingId ? formData : p));
        toast.success("Project updated successfully!");
      } else {
        toast.error("Failed to update project: " + error.message);
      }
    } else {
      const { data, error } = await supabase.from('projects').insert([{
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
        link: formData.link,
        image_url: formData.imageUrl
      }]).select();
      
      if (!error && data) {
        setProjects([{ ...formData, id: data[0].id }, ...projects]);
        toast.success("Project added successfully!");
      } else {
        toast.error("Failed to create project: " + error?.message);
      }
    }
    setIsAdding(false);
    setEditingId(null);
    setFormData({ id: '', title: '', description: '', tags: '', link: '', imageUrl: '' });
  };

  const handleEdit = (project: Project) => {
    setFormData(project);
    setEditingId(project.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (!error) {
        setProjects(projects.filter(p => p.id !== id));
        toast.success("Project deleted successfully!");
      } else {
        toast.error("Failed to delete project: " + error.message);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setAuthError('Wrong email or password. Please try again.');
        } else {
          setAuthError(error.message);
        }
      } else {
        toast.success("Logged in successfully!");
      }
    } catch (err: any) {
      setAuthError('Network error: ' + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
     return (
       <>
         <div className="custom-cursor" ref={cursorRef}></div>
         <canvas id="universe-canvas" ref={canvasRef}></canvas>
         <div className="relative z-10 min-h-screen flex flex-col justify-center items-center p-4 text-[#1a1a1a]">
           <div className="glass-panel p-8 sm:p-10 max-w-md w-full shadow-2xl backdrop-blur-xl bg-white/50 pointer-events-auto border border-white/60">
             <h1 className="text-4xl font-bold mb-8 text-center font-['Shadows_Into_Light'] text-blue-700">Admin Access</h1>
             <form onSubmit={handleLogin} className="flex flex-col gap-5">
               {authError && <div className="text-red-500 text-sm font-semibold text-center">{authError}</div>}
               <input type="email" placeholder="Admin Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="glass-input p-4 rounded-xl text-[#1a1a1a] shadow-[0_2px_10px_rgba(0,0,0,0.05)] focus:shadow-[0_4px_15px_rgba(0,0,0,0.1)]" />
               <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="glass-input p-4 rounded-xl text-[#1a1a1a] shadow-[0_2px_10px_rgba(0,0,0,0.05)] focus:shadow-[0_4px_15px_rgba(0,0,0,0.1)]" />
               <button type="submit" className="glass-btn w-full mt-4 py-4 font-bold tracking-wider rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all bg-white/70 hover:bg-white border border-gray-200">LOGIN</button>
             </form>
           </div>
         </div>
       </>
     );
  }

  return (
     <>
       <div className="custom-cursor" ref={cursorRef}></div>
       <canvas id="universe-canvas" ref={canvasRef}></canvas>
       <div className="relative z-10 min-h-screen p-4 sm:p-8 text-[#1a1a1a] pointer-events-auto">
          <div className="max-w-6xl mx-auto">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
               <h1 className="text-4xl sm:text-5xl font-bold font-['Shadows_Into_Light'] text-blue-700 drop-shadow-sm text-center sm:text-left">Project Dashboard</h1>
               <button onClick={handleLogout} className="glass-btn px-6 py-2 rounded-full shadow-md font-bold text-sm bg-white/60 hover:bg-white/90 transition-colors">Logout</button>
             </div>
             
             {isAdding ? (
               <div className="glass-panel p-6 sm:p-8 mb-8 backdrop-blur-xl bg-white/60">
                 <h2 className="text-2xl font-bold mb-6 text-[#1a1a1a]">{editingId ? "Edit Project" : "Add New Project"}</h2>
                 <form className="flex flex-col gap-5" onSubmit={handleSave}>
                   <input type="text" placeholder="Project Title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="glass-input p-4 rounded-xl text-[#1a1a1a]" />
                   <textarea placeholder="Description" required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="glass-input p-4 rounded-xl resize-none text-[#1a1a1a]"></textarea>
                   <input type="text" placeholder="Tags (comma separated)" required value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="glass-input p-4 rounded-xl text-[#1a1a1a]" />
                   <input type="url" placeholder="Project Link (URL)" required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} className="glass-input p-4 rounded-xl text-[#1a1a1a]" />
                   
                   <div className="flex flex-col gap-2">
                     <label className="text-sm font-semibold opacity-80">Project Image (Upload or URL)</label>
                     <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                       <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
                       <span className="opacity-50 text-sm">OR</span>
                       <input type="url" placeholder="Image URL" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="glass-input p-3 rounded-xl text-[#1a1a1a] flex-grow w-full" />
                     </div>
                     {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="h-24 w-auto object-cover mt-2 rounded-lg shadow-sm border border-black/10" />}
                   </div>
                   
                   <div className="flex flex-col sm:flex-row gap-4 mt-4">
                     <button type="submit" className="glass-btn px-8 py-3 rounded-full font-bold shadow-md bg-white/70 hover:bg-white hover:-translate-y-0.5 transition-all">Save Project</button>
                     <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ id: '', title: '', description: '', tags: '', link: '', imageUrl: '' }); }} className="glass-btn px-8 py-3 rounded-full opacity-80 hover:opacity-100 transition-all">Cancel</button>
                   </div>
                 </form>
               </div>
             ) : (
               <div className="glass-panel p-6 sm:p-8 backdrop-blur-xl bg-white/50">
                   <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Manage Projects</h2>
                      <button onClick={() => setIsAdding(true)} className="glass-btn font-bold text-sm px-6 py-2 rounded-full shadow-md bg-white/60 hover:bg-white/90 hover:-translate-y-0.5 transition-all">Add New Project</button>
                   </div>
                   
                   <div className="grid gap-4">
                     {isLoadingProjects ? (
                       <p className="text-center opacity-60 italic p-6">Loading projects...</p>
                     ) : projects.length === 0 ? (
                       <p className="text-center opacity-60 italic p-6">No projects yet. Add one!</p>
                     ) : (
                       projects.map(project => (
                         <div key={project.id} className="glass-card p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40">
                            <div className="flex gap-4 items-center">
                              {project.imageUrl && <img src={project.imageUrl} alt={project.title} className="w-16 h-16 rounded-md object-cover border border-black/10" />}
                              <div>
                                <h3 className="font-bold text-lg text-[#1a1a1a]">{project.title}</h3>
                                <p className="text-sm opacity-80 max-w-md truncate">{project.description}</p>
                              </div>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                              <button onClick={() => handleEdit(project)} className="glass-btn text-sm px-4 py-2 flex-1 sm:flex-none font-semibold shadow-sm bg-white/60 hover:bg-white transition-all">Edit</button>
                              <button onClick={() => handleDelete(project.id)} className="glass-btn text-sm px-4 py-2 flex-1 sm:flex-none font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shadow-sm transition-all">Delete</button>
                            </div>
                         </div>
                       ))
                     )}
                   </div>
               </div>
             )}
          </div>
       </div>
     </>
  );
}
