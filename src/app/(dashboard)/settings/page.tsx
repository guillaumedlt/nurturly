"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical, Tag, Lock, Mail, User, Building2, Briefcase, Phone, Globe, Shield, Crown, UserPlus, LogOut, MoreHorizontal, Check, X, Copy, Bot, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Property {
  id: string;
  name: string;
  label: string;
  type: string;
  groupName: string;
  options: string[] | null;
  aiPrompt: string | null;
  aiConfigId: string | null;
  required: boolean;
  position: number;
}

const PROPERTY_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "boolean", label: "Yes / No" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "ai", label: "AI Generated" },
];

const CONTACT_GROUPS = ["Contact info", "Company info", "Deal info", "Custom"];
const COMPANY_GROUPS = ["Company info", "Custom"];

const CONTACT_BUILTINS = [
  { name: "email", label: "Email", type: "Email", icon: Mail, required: true },
  { name: "first_name", label: "First name", type: "Text", icon: User, required: false },
  { name: "last_name", label: "Last name", type: "Text", icon: User, required: false },
  { name: "company", label: "Company", type: "Text", icon: Building2, required: false },
  { name: "job_title", label: "Job title", type: "Text", icon: Briefcase, required: false },
  { name: "phone", label: "Phone", type: "Phone", icon: Phone, required: false },
];

const COMPANY_BUILTINS = [
  { name: "name", label: "Name", type: "Text", icon: Building2, required: true },
  { name: "domain", label: "Domain", type: "URL", icon: Globe, required: false },
  { name: "industry", label: "Industry", type: "Text", icon: Briefcase, required: false },
  { name: "size", label: "Size", type: "Text", icon: User, required: false },
  { name: "phone", label: "Phone", type: "Phone", icon: Phone, required: false },
  { name: "website", label: "Website", type: "URL", icon: Globe, required: false },
];

type TabKey = "contact-properties" | "company-properties" | "profile" | "team" | "ai";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "google", label: "Google (Gemini)" },
];

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "o3-mini", label: "o3-mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.5-pro-preview-06-05", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
};

interface Profile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const [contactProps, setContactProps] = useState<Property[]>([]);
  const [companyProps, setCompanyProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("text");
  const [newGroup, setNewGroup] = useState("Custom");
  const [newOptions, setNewOptions] = useState("");
  const [newAiPrompt, setNewAiPrompt] = useState("");
  const [newAiConfigId, setNewAiConfigId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("contact-properties");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; label: string } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Team state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [teamLoading, setTeamLoading] = useState(true);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState<{ id: string; name: string } | null>(null);

  // AI state
  interface AiConfig {
    id: string;
    name: string;
    provider: string;
    model: string;
    maskedKey: string;
    isDefault: boolean;
  }
  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [showAddAi, setShowAddAi] = useState(false);
  const [editingAiId, setEditingAiId] = useState<string | null>(null);
  const [aiFormName, setAiFormName] = useState("");
  const [aiFormProvider, setAiFormProvider] = useState("");
  const [aiFormModel, setAiFormModel] = useState("");
  const [aiFormKey, setAiFormKey] = useState("");
  const [aiShowKey, setAiShowKey] = useState(false);
  const [deleteAiConfirm, setDeleteAiConfirm] = useState<{ id: string; name: string } | null>(null);

  const fetchProperties = useCallback(async () => {
    const [contactRes, companyRes] = await Promise.all([
      fetch("/api/contact-properties"),
      fetch("/api/company-properties"),
    ]);
    if (contactRes.ok) {
      const data = await contactRes.json();
      setContactProps(data.properties);
    }
    if (companyRes.ok) {
      const data = await companyRes.json();
      setCompanyProps(data.properties);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setProfileName(data.name || "");
      setProfileEmail(data.email);
    }
  }, []);

  // Fetch team
  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/invitations"),
      ]);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.invitations || []);
      }
    } finally {
      setTeamLoading(false);
    }
  }, []);

  // Fetch AI configs
  const fetchAiConfigs = useCallback(async () => {
    const res = await fetch("/api/settings/ai-configs");
    if (res.ok) {
      const data = await res.json();
      setAiConfigs(data.configs);
      setAiLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "profile" && !profile) fetchProfile();
    if (activeTab === "team") fetchTeam();
    if ((activeTab === "ai" || activeTab === "contact-properties" || activeTab === "company-properties") && !aiLoaded) fetchAiConfigs();
  }, [activeTab, profile, fetchProfile, fetchTeam, aiLoaded, fetchAiConfigs]);

  const resetAiForm = () => {
    setAiFormName("");
    setAiFormProvider("");
    setAiFormModel("");
    setAiFormKey("");
    setAiShowKey(false);
    setShowAddAi(false);
    setEditingAiId(null);
  };

  const startEditAi = (config: AiConfig) => {
    setEditingAiId(config.id);
    setAiFormName(config.name);
    setAiFormProvider(config.provider);
    setAiFormModel(config.model);
    setAiFormKey("");
    setAiShowKey(false);
    setShowAddAi(false);
  };

  const handleSaveAiConfig = async () => {
    if (!aiFormName.trim() || !aiFormProvider || !aiFormModel) return;
    if (!editingAiId && !aiFormKey.trim()) return;

    setSavingAi(true);
    try {
      if (editingAiId) {
        // Update
        const payload: Record<string, unknown> = {
          id: editingAiId,
          name: aiFormName.trim(),
          provider: aiFormProvider,
          model: aiFormModel,
        };
        if (aiFormKey.trim()) payload.apiKey = aiFormKey.trim();

        const res = await fetch("/api/settings/ai-configs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          toast.success("Configuration updated");
          resetAiForm();
          fetchAiConfigs();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to update");
        }
      } else {
        // Create
        const res = await fetch("/api/settings/ai-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: aiFormName.trim(),
            provider: aiFormProvider,
            apiKey: aiFormKey.trim(),
            model: aiFormModel,
          }),
        });
        if (res.ok) {
          toast.success("Configuration added");
          resetAiForm();
          fetchAiConfigs();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to add configuration");
        }
      }
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSavingAi(false);
    }
  };

  const handleSetDefaultAi = async (id: string) => {
    const res = await fetch("/api/settings/ai-configs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isDefault: true }),
    });
    if (res.ok) {
      toast.success("Default updated");
      fetchAiConfigs();
    }
  };

  const handleDeleteAiConfig = async () => {
    if (!deleteAiConfirm) return;
    const res = await fetch("/api/settings/ai-configs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteAiConfirm.id }),
    });
    if (res.ok) {
      toast.success("Configuration deleted");
      setDeleteAiConfirm(null);
      fetchAiConfigs();
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim(), email: profileEmail.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        toast.success("Profile updated");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success("Password changed");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
      });
      if (res.ok) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        fetchTeam();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to send invitation");
      }
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, role: string) => {
    const res = await fetch(`/api/team/members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role }),
    });
    if (res.ok) {
      toast.success("Role updated");
      fetchTeam();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to update role");
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberConfirm) return;
    const res = await fetch(`/api/team/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: removeMemberConfirm.id }),
    });
    if (res.ok) {
      toast.success("Member removed");
      setRemoveMemberConfirm(null);
      fetchTeam();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to remove member");
      setRemoveMemberConfirm(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const res = await fetch(`/api/team/invitations`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    if (res.ok) {
      toast.success("Invitation cancelled");
      fetchTeam();
    } else {
      toast.error("Failed to cancel invitation");
    }
  };

  const isCompanyTab = activeTab === "company-properties";
  const currentProps = isCompanyTab ? companyProps : contactProps;
  const setCurrentProps = isCompanyTab ? setCompanyProps : setContactProps;
  const apiEndpoint = isCompanyTab ? "/api/company-properties" : "/api/contact-properties";
  const groups = isCompanyTab ? COMPANY_GROUPS : CONTACT_GROUPS;
  const builtins = isCompanyTab ? COMPANY_BUILTINS : CONTACT_BUILTINS;

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        label: newLabel.trim(),
        type: newType,
        groupName: newGroup,
        position: currentProps.length,
      };
      if ((newType === "select" || newType === "multi_select") && newOptions.trim()) {
        body.options = newOptions.split(",").map((o) => o.trim()).filter(Boolean);
      }
      if (newType === "ai") {
        body.aiPrompt = newAiPrompt.trim();
        body.aiConfigId = newAiConfigId || null;
      }
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setCurrentProps((prev) => [...prev, created]);
        setNewLabel("");
        setNewType("text");
        setNewGroup("Custom");
        setNewOptions("");
        setNewAiPrompt("");
        setNewAiConfigId("");
        toast.success("Property created");
      } else {
        toast.error("Failed to create property");
      }
    } catch {
      toast.error("Failed to create property");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, label: string) => {
    setDeleteConfirm({ id, label });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(apiEndpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });
      if (res.ok) {
        setCurrentProps((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
        toast.success("Property deleted");
      } else {
        toast.error("Failed to delete property");
      }
    } catch {
      toast.error("Failed to delete property");
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Group properties
  const grouped: Record<string, Property[]> = {};
  for (const p of currentProps) {
    if (!grouped[p.groupName]) grouped[p.groupName] = [];
    grouped[p.groupName].push(p);
  }

  const renderPropertiesTab = () => (
    <div className="space-y-6">
      {/* Create property */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-[13px] font-medium text-foreground mb-4">Add a custom property</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Lifecycle stage"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Group</label>
            <select
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button size="sm" className="h-9 w-full text-[12px]" onClick={handleCreate} disabled={!newLabel.trim() || creating}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {creating ? "Adding..." : "Add property"}
            </Button>
          </div>
        </div>
        {(newType === "select" || newType === "multi_select") && (
          <div className="mt-3">
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Options (comma-separated)</label>
            <input
              type="text"
              value={newOptions}
              onChange={(e) => setNewOptions(e.target.value)}
              placeholder="e.g. Lead, Qualified, Customer, Churned"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
            />
          </div>
        )}
        {newType === "ai" && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">AI Prompt</label>
              <textarea
                value={newAiPrompt}
                onChange={(e) => setNewAiPrompt(e.target.value)}
                placeholder="e.g. Based on this contact's company and job title, determine their likely industry sector"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40 resize-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                The AI will receive all the contact&apos;s data along with this prompt to generate the value.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">AI Provider</label>
              <select
                value={newAiConfigId}
                onChange={(e) => setNewAiConfigId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="">Use default</option>
                {aiConfigs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({AI_PROVIDERS.find((p) => p.value === c.provider)?.label} — {AI_MODELS[c.provider]?.find((m) => m.value === c.model)?.label || c.model})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Built-in properties */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Default properties</h4>
        <div className="rounded-xl border border-border bg-background divide-y divide-border">
          {builtins.map((prop) => {
            const Icon = prop.icon;
            return (
              <div key={prop.name} className="flex items-center gap-3 px-5 py-3">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{prop.label}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">{prop.type}</Badge>
                    {prop.required && (
                      <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Required</span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Internal name: {prop.name}</span>
                </div>
                <div className="flex h-7 w-7 items-center justify-center text-muted-foreground/30" title="Built-in property">
                  <Lock className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom property list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      ) : currentProps.length === 0 ? (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Custom properties</h4>
          <div className="rounded-xl border border-border bg-background">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="h-7 w-7 text-muted-foreground/30" strokeWidth={1.5} />
              <p className="mt-3 text-[13px] font-medium text-foreground">No custom properties yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground max-w-[280px]">
                Add custom properties above to track additional data.
              </p>
            </div>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([group, props]) => (
          <div key={group}>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{group}</h4>
            <div className="rounded-xl border border-border bg-background divide-y divide-border">
              {props.map((prop) => (
                <div key={prop.id} className="group flex items-center gap-3 px-5 py-3">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{prop.label}</span>
                      <Badge variant="outline" className="text-[10px] font-normal">{PROPERTY_TYPES.find((t) => t.value === prop.type)?.label || prop.type}</Badge>
                      {prop.required && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Required</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">Internal name: {prop.name}</span>
                    {prop.options && prop.options.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {prop.options.map((opt) => (
                          <span key={opt} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{opt}</span>
                        ))}
                      </div>
                    )}
                    {prop.type === "ai" && prop.aiPrompt && (
                      <div className="mt-1">
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-3 w-3 text-muted-foreground/50" />
                          <span className="text-[11px] text-muted-foreground italic truncate max-w-[400px]">{prop.aiPrompt}</span>
                        </div>
                        {prop.aiConfigId && (
                          <span className="text-[10px] text-muted-foreground/50 ml-[18px]">
                            Provider: {aiConfigs.find((c) => c.id === prop.aiConfigId)?.name || "Custom"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(prop.id, prop.label)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Settings</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Manage your account and properties.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        {[
          { key: "profile" as TabKey, label: "Profile" },
          { key: "team" as TabKey, label: "Team" },
          { key: "ai" as TabKey, label: "AI" },
          { key: "contact-properties" as TabKey, label: "Contact Properties" },
          { key: "company-properties" as TabKey, label: "Company Properties" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); setNewLabel(""); setNewType("text"); setNewGroup("Custom"); setNewOptions(""); setNewAiPrompt(""); setNewAiConfigId(""); }}
            className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {(activeTab === "contact-properties" || activeTab === "company-properties") && renderPropertiesTab()}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title="Delete property"
        description={`Are you sure you want to delete "${deleteConfirm?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {!profile ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Profile info */}
              <div className="rounded-xl border border-border bg-background p-5">
                <h3 className="text-[13px] font-medium text-foreground mb-4">Profile information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Full name</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your name"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={handleSaveProfile}
                    disabled={savingProfile || (profileName === (profile.name || "") && profileEmail === profile.email)}
                  >
                    {savingProfile ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </div>

              {/* Change password */}
              <div className="rounded-xl border border-border bg-background p-5">
                <h3 className="text-[13px] font-medium text-foreground mb-4">Change password</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Current password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">New password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Confirm password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    className="h-8 text-[12px]"
                    onClick={handleChangePassword}
                    disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {changingPassword ? "Changing..." : "Change password"}
                  </Button>
                </div>
              </div>

              {/* Account info */}
              <div className="rounded-xl border border-border bg-background p-5">
                <h3 className="text-[13px] font-medium text-foreground mb-3">Account</h3>
                <div className="space-y-2 text-[12px] text-muted-foreground">
                  <p>Account ID: <span className="font-mono text-foreground">{profile.id.slice(0, 8)}</span></p>
                  <p>Member since: <span className="text-foreground">{new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-6">
          {/* Invite form */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="text-[13px] font-medium text-foreground mb-4">Invite team member</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                className="h-9 w-32 rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button size="sm" className="h-9 text-[12px]" onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                {inviting ? "Sending..." : "Invite"}
              </Button>
            </div>
          </div>

          {/* Members list */}
          <div>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              Members ({members.length})
            </h4>
            {teamLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-border bg-background">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="h-7 w-7 text-muted-foreground/30" strokeWidth={1.5} />
                  <p className="mt-3 text-[13px] font-medium text-foreground">No team members yet</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Invite your first team member above.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-background divide-y divide-border">
                {members.map((member) => (
                  <div key={member.id} className="group flex items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[12px] font-medium text-muted-foreground">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground">{member.name || member.email}</span>
                        {member.role === "owner" && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            <Crown className="h-2.5 w-2.5" /> Owner
                          </span>
                        )}
                        {member.role === "admin" && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                            <Shield className="h-2.5 w-2.5" /> Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{member.email}</span>
                    </div>
                    {member.role !== "owner" && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className="h-7 rounded-md border border-input bg-background px-2 text-[11px] outline-none"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setRemoveMemberConfirm({ id: member.id, name: member.name || member.email })}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div>
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                Pending invitations ({invitations.filter((i) => i.status === "pending").length})
              </h4>
              <div className="rounded-xl border border-border bg-background divide-y divide-border">
                {invitations.filter((i) => i.status === "pending").map((invite) => (
                  <div key={invite.id} className="group flex items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-[12px] text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[13px] text-foreground">{invite.email}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] font-normal">{invite.role}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelInvitation(invite.id)}
                      className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Tab */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          {!aiLoaded ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-[13px] font-medium text-foreground">AI Configurations</h3>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Add multiple LLM providers and choose which one to use for each generation.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-8 text-[12px]"
                  onClick={() => { resetAiForm(); setShowAddAi(true); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              {/* Config list */}
              {aiConfigs.length === 0 && !showAddAi && (
                <div className="rounded-xl border border-dashed border-border py-12 text-center">
                  <Bot className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-2 text-[13px] text-muted-foreground">No AI configurations yet</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground/60">Add your first LLM API key to start generating templates with AI</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 h-8 text-[12px]"
                    onClick={() => { resetAiForm(); setShowAddAi(true); }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add configuration
                  </Button>
                </div>
              )}

              {aiConfigs.map((config) => (
                <div key={config.id} className="rounded-xl border border-border bg-background p-4">
                  {editingAiId === config.id ? (
                    /* Inline edit form */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</label>
                          <input
                            type="text"
                            value={aiFormName}
                            onChange={(e) => setAiFormName(e.target.value)}
                            placeholder="e.g. GPT-4o Fast"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Provider</label>
                          <select
                            value={aiFormProvider}
                            onChange={(e) => { setAiFormProvider(e.target.value); setAiFormModel(""); }}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                          >
                            <option value="">Select...</option>
                            {AI_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Model</label>
                          <select
                            value={aiFormModel}
                            onChange={(e) => setAiFormModel(e.target.value)}
                            disabled={!aiFormProvider}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
                          >
                            <option value="">Select...</option>
                            {(AI_MODELS[aiFormProvider] || []).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">API Key</label>
                          <div className="relative">
                            <input
                              type={aiShowKey ? "text" : "password"}
                              value={aiFormKey}
                              onChange={(e) => setAiFormKey(e.target.value)}
                              placeholder="Leave empty to keep current key"
                              className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 font-mono text-[12px] outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40 placeholder:font-sans"
                            />
                            <button type="button" onClick={() => setAiShowKey(!aiShowKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {aiShowKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-8 text-[12px]" onClick={resetAiForm}>Cancel</Button>
                        <Button size="sm" className="h-8 text-[12px]" onClick={handleSaveAiConfig} disabled={savingAi || !aiFormName.trim() || !aiFormProvider || !aiFormModel}>
                          {savingAi ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display row */
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground truncate">{config.name}</span>
                          {config.isDefault && (
                            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-medium text-foreground">Default</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
                          <span className="capitalize">{AI_PROVIDERS.find(p => p.value === config.provider)?.label || config.provider}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span>{AI_MODELS[config.provider]?.find(m => m.value === config.model)?.label || config.model}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="font-mono text-[11px]">{config.maskedKey}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!config.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAi(config.id)}
                            title="Set as default"
                            className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Check className="h-3 w-3" />
                            Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditAi(config)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteAiConfirm({ id: config.id, name: config.name })}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new config form */}
              {showAddAi && (
                <div className="rounded-xl border border-ring/30 bg-background p-4">
                  <div className="mb-3 text-[12px] font-medium text-foreground">New configuration</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</label>
                        <input
                          type="text"
                          value={aiFormName}
                          onChange={(e) => setAiFormName(e.target.value)}
                          placeholder="e.g. Claude Sonnet 4"
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Provider</label>
                        <select
                          value={aiFormProvider}
                          onChange={(e) => { setAiFormProvider(e.target.value); setAiFormModel(""); }}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select...</option>
                          {AI_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Model</label>
                        <select
                          value={aiFormModel}
                          onChange={(e) => setAiFormModel(e.target.value)}
                          disabled={!aiFormProvider}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
                        >
                          <option value="">Select...</option>
                          {(AI_MODELS[aiFormProvider] || []).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">API Key</label>
                        <div className="relative">
                          <input
                            type={aiShowKey ? "text" : "password"}
                            value={aiFormKey}
                            onChange={(e) => setAiFormKey(e.target.value)}
                            placeholder="sk-... or AIza..."
                            className="h-9 w-full rounded-md border border-input bg-background pl-3 pr-10 font-mono text-[12px] outline-none focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40 placeholder:font-sans"
                          />
                          <button type="button" onClick={() => setAiShowKey(!aiShowKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {aiShowKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground/50">
                          {aiFormProvider === "openai" && "platform.openai.com/api-keys"}
                          {aiFormProvider === "anthropic" && "console.anthropic.com/settings/keys"}
                          {aiFormProvider === "google" && "aistudio.google.com/apikey"}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" className="h-8 text-[12px]" onClick={resetAiForm}>Cancel</Button>
                      <Button
                        size="sm"
                        className="h-8 text-[12px]"
                        onClick={handleSaveAiConfig}
                        disabled={savingAi || !aiFormName.trim() || !aiFormProvider || !aiFormModel || !aiFormKey.trim()}
                      >
                        {savingAi ? "Saving..." : "Add configuration"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <h4 className="text-[12px] font-medium text-foreground mb-2">How it works</h4>
                <ul className="space-y-1.5 text-[12px] text-muted-foreground">
                  <li>1. Add one or more AI configurations (OpenAI, Anthropic, Google)</li>
                  <li>2. Set one as default — it will be pre-selected when generating templates</li>
                  <li>3. Go to Emails → Templates → "Generate with AI" and choose which model to use</li>
                </ul>
              </div>
            </>
          )}

          {/* Delete AI config confirm */}
          <ConfirmDialog
            open={!!deleteAiConfirm}
            onOpenChange={() => setDeleteAiConfirm(null)}
            title="Delete AI configuration"
            description={`Are you sure you want to delete "${deleteAiConfirm?.name}"? This cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={handleDeleteAiConfig}
          />
        </div>
      )}

      {/* Remove member confirm */}
      <ConfirmDialog
        open={!!removeMemberConfirm}
        onOpenChange={() => setRemoveMemberConfirm(null)}
        title="Remove team member"
        description={`Are you sure you want to remove ${removeMemberConfirm?.name}? They will lose access to this workspace.`}
        confirmLabel="Remove"
        onConfirm={handleRemoveMember}
      />
    </div>
  );
}
