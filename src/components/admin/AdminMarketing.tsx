import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone, Send, Bell, Mail } from "lucide-react";
import { toast } from "sonner";

const AdminMarketing = () => {
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");

  const handleAnnouncement = () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    // Placeholder — will integrate with notification system
    toast.success("Announcement saved! Integration coming soon.");
    setAnnouncementTitle("");
    setAnnouncementBody("");
  };

  const handleCampaign = () => {
    if (!campaignSubject.trim() || !campaignBody.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    // Placeholder — will integrate with email provider
    toast.success("Campaign draft saved! Email integration coming soon.");
    setCampaignSubject("");
    setCampaignBody("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Marketing & Announcements</h2>
        <p className="text-muted-foreground text-sm">Create announcements and marketing campaigns for your users</p>
      </div>

      {/* In-App Announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            In-App Announcement
          </CardTitle>
          <CardDescription>Send a notification to all active users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="e.g. Valentine's Day Special!"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
              value={announcementBody}
              onChange={(e) => setAnnouncementBody(e.target.value)}
              placeholder="Write your announcement message..."
            />
          </div>
          <Button onClick={handleAnnouncement} className="gap-2">
            <Send className="h-4 w-4" />
            Send Announcement
          </Button>
        </CardContent>
      </Card>

      {/* Email Campaign */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Campaign
          </CardTitle>
          <CardDescription>Draft an email campaign to send to all users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject Line</Label>
            <Input
              value={campaignSubject}
              onChange={(e) => setCampaignSubject(e.target.value)}
              placeholder="e.g. New Date Ideas Just for You 💕"
            />
          </div>
          <div className="space-y-2">
            <Label>Email Body</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px]"
              value={campaignBody}
              onChange={(e) => setCampaignBody(e.target.value)}
              placeholder="Write your email content..."
            />
          </div>
          <Button onClick={handleCampaign} className="gap-2">
            <Megaphone className="h-4 w-4" />
            Save Campaign Draft
          </Button>
        </CardContent>
      </Card>

      {/* Advertising placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Advertising & Promotions
          </CardTitle>
          <CardDescription>Manage sponsored content and promotional partnerships</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Coming soon — manage affiliate links for gift recommendations, sponsored date venues, and promotional banners.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMarketing;
