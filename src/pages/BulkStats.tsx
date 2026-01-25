import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Scissors, Download, BarChart3, Calendar, Link2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { downloadBlob } from "@/features/bulk/BulkQRZip";
import { getShortUrl } from "@/lib/domain";

interface BatchStats {
  batch_id: string;
  count: number;
  total_clicks: number;
  created_at: string;
}

export default function BulkStats() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBatches = async () => {
      // Use links_safe view to avoid exposing password_hash to client
      const { data, error } = await supabase
        .from("links_safe")
        .select("batch_id, click_count, created_at")
        .eq("user_id", user.id)
        .not("batch_id", "is", null);

      if (error) {
        console.error("Error fetching batches:", error);
        setLoading(false);
        return;
      }

      // Group by batch_id
      const batchMap = new Map<string, BatchStats>();
      data?.forEach((link) => {
        if (!link.batch_id) return;
        const existing = batchMap.get(link.batch_id);
        if (existing) {
          existing.count++;
          existing.total_clicks += link.click_count || 0;
        } else {
          batchMap.set(link.batch_id, {
            batch_id: link.batch_id,
            count: 1,
            total_clicks: link.click_count || 0,
            created_at: link.created_at,
          });
        }
      });

      setBatches(Array.from(batchMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setLoading(false);
    };

    fetchBatches();
  }, [user]);

  const exportBatchCSV = async (batchId: string) => {
    // Use links_safe view to avoid exposing password_hash to client
    const { data } = await supabase
      .from("links_safe")
      .select("*")
      .eq("batch_id", batchId);

    if (!data) return;

    const csv = [
      "Original URL,Short URL,Clicks,Created",
      ...data.map(l => `"${l.original_url}","${getShortUrl(l.custom_slug || l.short_code)}",${l.click_count || 0},"${l.created_at}"`)
    ].join("\n");

    downloadBlob(new Blob([csv], { type: "text/csv" }), `batch-${batchId}.csv`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12 container">
        <div className="flex items-center gap-3 mb-8">
          <Scissors className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Bulk Stats</h1>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-xl" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No bulk batches yet. Create one from the dashboard!
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch, i) => (
              <motion.div
                key={batch.batch_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border bg-card flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{batch.batch_id}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {batch.count} links
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {batch.total_clicks} clicks
                    </span>
                    <span>Avg: {(batch.total_clicks / batch.count).toFixed(1)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(batch.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportBatchCSV(batch.batch_id)}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
