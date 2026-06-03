require("dotenv").config();
require("../config/database");

const storiesRepo = require("../repositories/stories_repository");

const storyId = "prod-1767933453817-b2-410";

const localizations = [
  {
    lang: "pt",
    title: "Triunfo Duradouro",
    summary:
      "Um conto emocionante sobre a jornada de uma jovem mulher durante a Revolução Francesa, mesclando autenticidade histórica com nuances de autoajuda que celebram a resiliência humana e o crescimento pessoal.",
    text: "Nas movimentadas ruas de Paris no final dos anos 1780, Vivienne Deschamps, uma jovem costureira, viveu entre a agitação da Revolução Francesa. Sua paixão por mudanças se equiparava ao seu desejo de superar dificuldades pessoais.\n\n'Cada ponto é um passo em direção ao meu destino,' ela costumava dizer, servindo como motivação para descobrir seu verdadeiro potencial.\n\nÀ medida que a Revolução se intensificava, Vivienne se viu envolvida em uma reunião do grupo rebelde. Inicialmente, ela estava deslocada, mas sua crença inabalável na igualdade e liberdade a fez um farol entre as vozes dissidentes.\n\nSua primeira tarefa foi entregar mensagens criptografadas pela cidade. Arriscando sua vida repetidamente, Vivienne aprendeu a transformar seu medo em firmeza, sua ansiedade em audácia. Com cada missão, sua confiança aumentava e sua autoestima se fortalecia.\n\nUma vez, quando foi presa sob suspeita, ela invocou princípios de autoajuda que havia aprendido. Vivienne praticou respiração profunda e visualização para permanecer calma sob as incessantes perguntas do constabulário intrusivo. Seu equilíbrio prevaleceu deixando os oficiais sem qualquer evidência substancial. A resiliente determinação e a calma de Vivienne não só a libertaram, mas também fortaleceram sua decisão.\n\nNo rescaldo do período mais violento da Revolução, o Reinado do Terror, a função de Vivienne aumentou, tornando-se uma voz influente nas reuniões do grupo. Ela desempenhou um papel crucial em uma revolta camponesa que levou ao ataque da Bastilha. Seu crescimento pessoal refletia na líder destemida que ela havia se tornado.\n\nEla também iniciou workshops para incutir princípios de autoajuda entre os membros do grupo. 'Sua maior arma é seu espírito indomável', ela afirmava. Vivienne havia se tornado a personificação do crescimento pessoal e da rebelião contra a opressão.\n\nQuando a fumaça da Revolução recuou, Vivienne não apenas ajudou a moldar uma nova França, mas também cresceu profundamente em autoconfiança e coragem. Sua história incentiva cada leitor a enfrentar as adversidades da vida com um coração forte e um espírito livre.\n\nNo final, Vivienne emergiu como um testamento ao impacto profundo dos princípios de autoajuda em tempos de grande desespero, provando que cada indivíduo guarda dentro de si o poder de não apenas afetar suas vidas, mas o mundo ao seu redor.",
  },
];

async function main() {
  const exists = await storiesRepo.storyExists(storyId);
  if (!exists) throw new Error(`Story not found: ${storyId}`);

  const results = [];
  for (const loc of localizations) {
    const row = await storiesRepo.upsertStoryLocalization(storyId, loc);
    results.push(row);
  }

  console.log(
    "✅ Added/Updated PT localization:",
    results.map((r) => r.lang)
  );

  process.exit(0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
