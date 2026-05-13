import Link from "next/link";
import { ArrowRight, Brain, CalendarCheck, MessageSquareMore, UploadCloud, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-20 flex flex-col items-center selection:bg-primary/20">
      
      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center mt-12 mb-32 w-full max-w-4xl mx-auto animate-fade-in">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10 dark:bg-primary/10"></div>
        
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8 backdrop-blur-md shadow-sm transition-transform hover:scale-105 cursor-pointer">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          StudyFlow AI v2.0 is now live
          <ChevronRight className="h-4 w-4" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
          Master your studies with <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">intelligent focus.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
          StudyFlow AI organizes your schedule, tracks your progress, and connects you with peers in real-time. Built for students who want to do more in less time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link 
            href="/signup" 
            className="w-full sm:w-auto rounded-full bg-primary px-8 py-4 text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center group"
          >
            Start your journey 
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto rounded-full px-8 py-4 text-foreground font-medium border border-border hover:bg-muted/50 transition-all flex items-center justify-center glass"
          >
            Sign in to dashboard
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-6xl animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything you need to excel</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">A unified workspace that replaces your scattered notes, calendars, and to-do lists with one intelligent workflow.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { 
              title: "AI Timetable", 
              desc: "Smart schedules tailored to your exam dates and energy levels.",
              icon: Brain 
            },
            { 
              title: "Task Planner", 
              desc: "Prioritize assignments and track completion with ease.",
              icon: CalendarCheck 
            },
            { 
              title: "Realtime Rooms", 
              desc: "Collaborate and study together with live chat & presence.",
              icon: MessageSquareMore 
            },
            { 
              title: "Secure Notes", 
              desc: "Keep all your PDFs and study materials organized in the cloud.",
              icon: UploadCloud 
            },
          ].map((item, idx) => (
            <div 
              key={item.title} 
              className="glass group relative overflow-hidden rounded-3xl p-6 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      
    </main>
  );
}
