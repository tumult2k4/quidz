import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardFlipCardProps {
  frontText: string;
  backText: string;
  onFeedback?: (isHelpful: boolean) => void;
  showFeedback?: boolean;
}

export function FlashcardFlipCard({ 
  frontText, 
  backText, 
  onFeedback,
  showFeedback = true 
}: FlashcardFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when card content changes
  useEffect(() => {
    setIsFlipped(false);
  }, [frontText, backText]);

  return (
    <div className="perspective-1000 w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative w-full h-96 transition-transform duration-500 transform-style-3d cursor-pointer",
          isFlipped && "rotate-y-180"
        )}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front Side */}
        <Card
          className={cn(
            "absolute w-full h-full backface-hidden flex items-center justify-center p-8 bg-gradient-to-br from-primary/10 to-primary/5",
            "border-2 border-primary/20"
          )}
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Frage</p>
            <p className="text-2xl font-semibold">{frontText}</p>
            <p className="text-sm text-muted-foreground mt-8">Klicken zum Umdrehen</p>
          </div>
        </Card>

        {/* Back Side */}
        <Card
          className={cn(
            "absolute w-full h-full backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-secondary/10 to-secondary/5",
            "border-2 border-secondary/20"
          )}
        >
          <div className="text-center flex-1 flex items-center justify-center">
            <div>
              <p className="text-sm text-muted-foreground mb-4">Antwort</p>
              <p className="text-xl">{backText}</p>
            </div>
          </div>
          
          {showFeedback && onFeedback && (
            <div className="flex gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedback(true);
                }}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Hilfreich
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedback(false);
                }}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Nicht hilfreich
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
