"use client";

function getDayIndex() {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
}

const WORDS = [
  { word: "Synergieren", type: "Verb", definition: "Durch das Zusammenwirken von Kräften einen Mehrwert schaffen, der über die Einzelleistungen hinausgeht." },
  { word: "Resilienz", type: "Substantiv", definition: "Die Fähigkeit, nach Rückschlägen oder widrigen Umständen wieder zu voller Stärke zurückzufinden." },
  { word: "disruptiv", type: "Adjektiv", definition: "Etwas, das bestehende Strukturen, Märkte oder Denkweisen grundlegend verändert oder zerstört." },
  { word: "Skalierbarkeit", type: "Substantiv", definition: "Die Eigenschaft eines Systems, bei steigender Anforderung proportional zu wachsen." },
  { word: "Agilität", type: "Substantiv", definition: "Die Fähigkeit, sich schnell und flexibel auf veränderte Bedingungen anzupassen." },
  { word: "iterativ", type: "Adjektiv", definition: "Schrittweise vorgehend, mit regelmäßigen Verbesserungszyklen." },
  { word: "Pivotieren", type: "Verb", definition: "Die Kernstrategie eines Unternehmens grundlegend ändern, um besser auf Marktbedürfnisse zu reagieren." },
];

export function WidgetWordOfDay() {
  const word = WORDS[getDayIndex() % WORDS.length];
  return (
    <div className="flex flex-col justify-center gap-3 h-full">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wort des Tages</span>
      <div>
        <span className="text-2xl font-bold text-foreground">{word.word}</span>
        <span className="ml-2 text-xs text-muted-foreground italic">{word.type}</span>
      </div>
      <p className="text-xs text-foreground leading-relaxed">{word.definition}</p>
    </div>
  );
}
