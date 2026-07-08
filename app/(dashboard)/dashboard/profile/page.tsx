"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/supabase/client";
import { User, Save, Loader2, Image as ImageIcon, ExternalLink, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserSearch } from "@/components/user-search";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"general" | "search">("general");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      
      // Load from profiles table first, fallback to user metadata
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      
      if (profile) {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || "");
      } else {
        setFullName(user.user_metadata?.full_name || "");
        setUsername(user.user_metadata?.username || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      }
      setLoading(false);
    }
    loadProfile();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      // 1. Update Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, username, avatar_url: avatarUrl }
      });
      if (authError) throw authError;

      // 2. Update Profiles Table
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        username: username,
        bio: bio,
        avatar_url: avatarUrl
      });
      if (profileError && profileError.code !== '42P01') {
        // Ignore relation does not exist in case they didn't run SQL yet
        throw profileError;
      }

      toast.success("Profile updated successfully!");
      router.refresh(); // Refresh layout to update navbar
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, provide a helpful fallback toast
        if (uploadError.message.includes('Bucket not found')) {
           toast.error("Avatar storage not configured yet. Run the SQL script first.");
           return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded. Don't forget to save changes!");
    } catch (error: any) {
      toast.error(error.message || "Error uploading image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAvatar = () => {
    setAvatarUrl("");
    toast.success("Avatar removed. Don't forget to save changes!");
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initial = fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and personal details.</p>
        </div>
        {username && (
          <Link
            href={`/u/${username}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors shrink-0 w-fit"
          >
            <ExternalLink className="h-4 w-4" />
            View public profile
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Left Column - Navigation */}
        <div className="space-y-2 md:col-span-1">
          <button
            onClick={() => setTab("general")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-colors",
              tab === "general"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <User className="h-4 w-4" />
            General Profile
          </button>
          <button
            onClick={() => setTab("search")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-colors",
              tab === "search"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <Users className="h-4 w-4" />
            Search Profiles
          </button>
        </div>

        {/* Right Column - Form */}
        <div className="md:col-span-3 space-y-6">
          {tab === "search" && (
            <section className="glass rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Search Profiles</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Find other students by username or name and view their public profile, streak, and XP.
                </p>
                <UserSearch />
              </div>
            </section>
          )}

          {tab === "general" && (
          <section className="glass rounded-2xl p-6 md:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-1">Public Profile</h2>
              <p className="text-sm text-muted-foreground mb-6">This information will be displayed on your profile and in study rooms.</p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={uploadAvatar} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  {uploading ? (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={96}
                      height={96}
                      className="rounded-full object-cover w-24 h-24 border-4 border-background shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-background">
                      {initial}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                    >
                      Upload new
                    </button>
                    <button 
                      onClick={removeAvatar}
                      disabled={uploading || !avatarUrl}
                      className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Recommended size: 256x256px. Max 2MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-background border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    placeholder="choose_a_username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full bg-muted/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded">Verified</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none"
                  placeholder="Tell us a little bit about yourself and your study goals..."
                ></textarea>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </section>
          )}
        </div>
      </div>
    </div>
  );
}
