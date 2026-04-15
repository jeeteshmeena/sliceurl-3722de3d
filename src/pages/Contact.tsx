import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Footer } from "@/components/Footer";
import { SliceLogo } from "@/components/SliceLogo";
import { Card, CardContent } from "@/components/ui/card";

const details = [
  { icon: User, label: "Legal Name", value: "Jeetesh Meena" },
  { icon: Mail, label: "Email", value: "Sliceurl@Gmail.com", href: "mailto:Sliceurl@Gmail.com" },
  { icon: Phone, label: "Phone", value: "9691520194", href: "tel:+919691520194" },
  { icon: MapPin, label: "Address", value: "Bamori, Guna, Madhya Pradesh, India – 473001" },
];

export default function Contact() {
  const { t } = useLanguage();

  useEffect(() => {
    document.title = "Contact Us – SliceURL";
    const noindex = document.createElement("meta");
    noindex.name = "robots";
    noindex.content = "noindex, nofollow";
    document.head.appendChild(noindex);
    return () => { document.head.removeChild(noindex); };
  }, []);

  return (
    <div className="min-h-dvh bg-background flex flex-col safe-bottom">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center"><SliceLogo size="sm" /></Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />{t("go_home")}
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground text-sm mb-8">Reach out for any queries or support.</p>

        <Card>
          <CardContent className="p-6 space-y-5">
            {details.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <d.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  {d.href ? (
                    <a href={d.href} className="text-sm text-foreground underline hover:no-underline">{d.value}</a>
                  ) : (
                    <p className="text-sm text-foreground">{d.value}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
