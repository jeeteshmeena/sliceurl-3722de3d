import { useLanguage } from "@/lib/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqKeys = [
  { questionKey: "faq_q1", answerKey: "faq_a1" },
  { questionKey: "faq_q2", answerKey: "faq_a2" },
  { questionKey: "faq_q3", answerKey: "faq_a3" },
  { questionKey: "faq_q4", answerKey: "faq_a4" },
  { questionKey: "faq_q5", answerKey: "faq_a5" },
  { questionKey: "faq_q6", answerKey: "faq_a6" },
  { questionKey: "faq_q7", answerKey: "faq_a7" },
  { questionKey: "faq_q8", answerKey: "faq_a8" },
  { questionKey: "faq_q9", answerKey: "faq_a9" },
  { questionKey: "faq_q10", answerKey: "faq_a10" },
];

export function FAQSection() {
  const { t } = useLanguage();

  return (
    <section className="mt-16 sm:mt-20 max-w-3xl mx-auto" aria-labelledby="faq-heading">
      <div className="text-center mb-8 sm:mb-10">
        <h2 id="faq-heading" className="text-xl sm:text-2xl font-bold mb-2">
          {t("faq_title")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t("faq_subtitle")}
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {faqKeys.map((faq, index) => (
          <AccordionItem
            key={faq.questionKey}
            value={`item-${index}`}
            className="border border-border/50 rounded-xl px-4 bg-card/50 data-[state=open]:bg-card"
          >
            <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline">
              {t(faq.questionKey)}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {t(faq.answerKey)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
