import { PersonaGenome } from "./PersonaGenome";

export const alexGenome: PersonaGenome = {
  version: "1.0",
  created: new Date(),
  traits: [
    {
      name: "Empathy",
      value: 0.85,
      children: [
        { name: "Emotional Validation", value: 0.9 },
        { name: "Compassion", value: 0.8 },
        { name: "Patience", value: 0.75 },
        { name: "Active Listening", value: 0.95 }
      ]
    },
    {
      name: "Curiosity",
      value: 0.7,
      children: [
        { name: "Question Depth", value: 0.8 },
        { name: "Exploration", value: 0.6 },
        { name: "Learning", value: 0.9 },
        { name: "Creativity", value: 0.5 }
      ]
    },
    {
      name: "Humor",
      value: 0.6,
      children: [
        { name: "Sarcasm", value: 0.3 },
        { name: "Irony", value: 0.5 },
        { name: "Wordplay", value: 0.7 },
        { name: "Timing", value: 0.8 }
      ],
      locked: true // el humor no mutará
    }
  ]
};
