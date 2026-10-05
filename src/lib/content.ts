import {
  Activity,
  Brain,
  CalendarDays,
  CircleDollarSign,
  FlaskConical,
  HeartHandshake,
  HeartPulse,
  Leaf,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  Syringe,
  TestTube,
  type LucideIcon,
} from "lucide-react";

/* ---------------------------------------------------------------------------
 * Site content — single source of truth for every marketing section.
 * Copy is ported verbatim from the reference app.
 * ------------------------------------------------------------------------- */

export const navLinks = [
  { label: "About us", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Insurance", href: "#insurance" },
] as const;

export const heroBadgeMessages = [
  { text: "Whole-person care", icon: HeartHandshake },
  { text: "Clear, upfront guidance", icon: CircleDollarSign },
  { text: "Flexible scheduling", icon: CalendarDays },
] as const;

export const aboutListItems = [
  "Clear guidance at every step",
  "Care plans shaped around your life",
  "Support for every age and stage",
  "A team that knows you by name",
] as const;

export type Service = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const services: Service[] = [
  {
    title: "Chronic care",
    description:
      "Ongoing support and practical plans for managing long-term health conditions.",
    icon: Stethoscope,
  },
  {
    title: "Women's health",
    description:
      "Personalized preventive care and guidance for women through every stage of life.",
    icon: HeartPulse,
  },
  {
    title: "Pediatric care",
    description:
      "Gentle, attentive care that helps children grow, thrive, and feel comfortable.",
    icon: ShieldPlus,
  },
  {
    title: "Vaccinations",
    description:
      "Routine immunizations and clear guidance to protect every member of your family.",
    icon: Activity,
  },
  {
    title: "Laboratory services",
    description:
      "Convenient on-site testing for faster answers and fewer extra appointments.",
    icon: Syringe,
  },
  {
    title: "Family care",
    description:
      "Coordinated primary care for adults and families through every stage of life.",
    icon: Brain,
  },
  {
    title: "Preventive care",
    description:
      "Checkups, screenings, and practical support focused on lifelong wellbeing.",
    icon: TestTube,
  },
  {
    title: "Acute care",
    description:
      "Prompt evaluation and treatment for sudden illness, minor injury, and urgent concerns.",
    icon: FlaskConical,
  },
];

export const differentiators = [
  {
    title: "Holistic care",
    description:
      "We care for the whole person, supporting wellbeing beyond each symptom.",
  },
  {
    title: "Personalized plans",
    description:
      "Every care plan reflects your goals, daily needs, routines, and the life you lead.",
  },
  {
    title: "Experienced staff",
    description:
      "A trusted family medicine team offering attentive, compassionate care.",
  },
  {
    title: "Advanced technology",
    description:
      "Modern tools deliver faster insights, clearer answers, and confident care.",
  },
] as const;

export const insurancePartners = [
  { name: "Grove Mutual", icon: Leaf },
  { name: "Everwell", icon: HeartPulse },
  { name: "Kindred Care", icon: ShieldCheck },
  { name: "Luma Health", icon: Sparkles },
] as const;

export const doctors = [
  {
    name: "Dr. Jordan Reed",
    specialty: "Pediatrics",
    quote: "Every family deserves care that feels calm, clear, and collaborative.",
    image: "/media/team-1.webp",
    imageClassName: "",
  },
  {
    name: "Dr. Marcus Bennett",
    specialty: "Family Medicine",
    quote: "Clarity and kindness are as important as any prescription.",
    image: "/media/team-2.webp",
    imageClassName: "origin-top scale-110",
  },
  {
    name: "Dr. Maya Chen",
    specialty: "Internal Medicine",
    quote: "The best care begins when a patient feels truly heard.",
    image: "/media/team-3.webp",
    imageClassName: "",
  },
] as const;

export const faqs = [
  {
    question: "What should I bring?",
    answer:
      "Please bring a photo ID, insurance card, medication list, and any questions you would like to discuss.",
  },
  {
    question: "Can I book a same-day appointment?",
    answer:
      "Yes. Same-day availability varies, but our team will always help you find the soonest appropriate visit.",
  },
  {
    question: "Do you offer telehealth?",
    answer:
      "Yes. Many follow-ups and routine concerns can be handled through a secure video visit.",
  },
  {
    question: "Where can I park?",
    answer:
      "Free patient parking is available directly beside the clinic, including accessible spaces near the entrance.",
  },
  {
    question: "Do you accept my insurance?",
    answer:
      "We accept most major insurance plans. Call us with your member ID and our team will gladly confirm your coverage before your visit.",
  },
] as const;

export const clinicContact = {
  addressLines: ["500 Terry Francine Street,", "San Francisco, CA 94158"],
  email: "info@mysite.com",
  phone: "123-456-7890",
  phoneHref: "tel:+11234567890",
} as const;

export const footerContact = {
  addressLines: ["100 Wellness Way", "Springfield, USA 12345"],
  hoursLines: ["Mon–Fri: 8am–6pm", "Saturday: 9am–1pm"],
  phone: "123-456-7890",
  phoneHref: "tel:+11234567890",
} as const;
