import { Button } from "@/components/ui/button";
import { UtmParams } from "./UtmForm";
import { Instagram, MessageCircle, Youtube, Twitter, Facebook } from "lucide-react";

interface Preset {
  name: string;
  icon: React.ReactNode;
  params: UtmParams;
}

const presets: Preset[] = [
  {
    name: "Instagram Bio",
    icon: <Instagram className="h-4 w-4" />,
    params: {
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "profile_link",
      utm_term: "",
      utm_content: "",
    },
  },
  {
    name: "WhatsApp Share",
    icon: <MessageCircle className="h-4 w-4" />,
    params: {
      utm_source: "whatsapp",
      utm_medium: "messenger",
      utm_campaign: "share",
      utm_term: "",
      utm_content: "",
    },
  },
  {
    name: "YouTube Description",
    icon: <Youtube className="h-4 w-4" />,
    params: {
      utm_source: "youtube",
      utm_medium: "video",
      utm_campaign: "description",
      utm_term: "",
      utm_content: "",
    },
  },
  {
    name: "Twitter Post",
    icon: <Twitter className="h-4 w-4" />,
    params: {
      utm_source: "twitter",
      utm_medium: "social",
      utm_campaign: "tweet",
      utm_term: "",
      utm_content: "",
    },
  },
  {
    name: "Facebook Ads",
    icon: <Facebook className="h-4 w-4" />,
    params: {
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "paid_ad",
      utm_term: "",
      utm_content: "",
    },
  },
];

interface UtmPresetsProps {
  onSelect: (params: UtmParams) => void;
}

export function UtmPresets({ onSelect }: UtmPresetsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Quick Presets</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.name}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSelect(preset.params)}
            className="gap-1.5 text-xs"
          >
            {preset.icon}
            {preset.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
