import { Badge } from "@/components/ui/badge";
import { usePersona, type UserPersona } from "@/hooks/usePersona";

interface PersonaBadgeProps {
  userId: string | undefined;
}

export function PersonaBadge({ userId }: PersonaBadgeProps) {
  const { persona, loading, getLabel, getColor } = usePersona(userId);

  if (loading || !persona) return null;

  return (
    <Badge 
      variant="secondary" 
      className={`text-xs font-medium text-white ${getColor(persona.persona)}`}
    >
      {getLabel(persona.persona)}
    </Badge>
  );
}
