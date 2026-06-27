import Link from "next/link";
import { ArrowRight, Brain, CalendarCheck, MessageSquareMore, UploadCloud, ChevronRight } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

const features = [
  { title: "AI Timetable", desc: "Smart schedules tailored to your exam dates and energy levels.", icon: Brain },
  { title: "Task Planner", desc: "Prioritize assignments and track completion with ease.", icon: CalendarCheck },
  { title: "Realtime Rooms", desc: "Collaborate and study together with live chat & presence.", icon: MessageSquareMore },
  { title: "Secure Notes", desc: "Keep all your PDFs and study materials organized in the cloud.", icon: UploadCloud },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-5 sm:px-6 sm:py-6 flex flex-col items-center selection:bg-primary/20 overflow-x-hidden">

      {/* Top navigation */}
      <header className="w-full flex items-center justify-between py-2 mb-12 sm:mb-20">
        <BrandLogo size={32} textClassName="text-base sm:text-lg" />
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Log in
        </Link>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center text-center mt-6 mb-24 sm:mt-10 sm:mb-32 w-full max-w-4xl mx-auto animate-fade-in">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[600px] sm:h-[600px] max-w-[90vw] bg-primary/20 blur-[100px] sm:blur-[120px] rounded-full pointer-events-none -z-10 dark:bg-primary/10"></div>

        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 sm:px-4 text-xs sm:text-sm font-medium text-primary mb-6 sm:mb-8 backdrop-blur-md shadow-sm">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          StudyFlow AI v2.0 is now live
          <ChevronRight className="h-4 w-4 shrink-0" />
        </div>

        <h1 className="text-[2rem] leading-[1.15] sm:text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-5 sm:mb-6 sm:leading-[1.1]">
          Master your studies with <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">intelligent focus.</span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl leading-relaxed">
          StudyFlow AI organizes your schedule, tracks your progress, and connects you with peers in real-time. Built for students who want to do more in less time.
        </p>

        {/* Single primary call-to-action — login lives in the top nav */}
        <div className="flex flex-col items-center gap-3 w-full">
          <Link
            href="/signup"
            className="w-full sm:w-auto rounded-full bg-primary px-8 py-3.5 sm:py-4 text-base text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center group"
          >
            Start your journey
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Free to start · No credit card required
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="w-full max-w-6xl animate-slide-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Everything you need to excel</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">A unified workspace that replaces your scattered notes, calendars, and to-do lists with one intelligent workflow.</p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((item) => (
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

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-20 sm:mt-28 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <BrandLogo size={24} textClassName="text-sm" />
        <p className="text-xs sm:text-sm text-muted-foreground order-last sm:order-none">© 2026 StudyFlow AI · Built for focused students.</p>
        <div className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <Link href="/login" className="hover:text-foreground transition-colors">Log in</Link>
          <Link href="/signup" className="hover:text-foreground transition-colors">Sign up</Link>
        </div>
      </footer>

    </main>
  );
}
