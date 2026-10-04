// Navigation Links
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Labs', href: '/labs' },
  { label: 'Workshops', href: '/workshops' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'About Us', href: '/about' },
];

export const CONTACT_INFO = {
  address: '3rd cross, Garden Street Extension, Bangalore - 560016',
  phone: '+91 7349045770',
  email: 'info@cybotz.tech',
};

export const SOCIAL_LINKS = [
  { label: 'LinkedIn', url: 'https://linkedin.com/company/cybotz', icon: 'linkedin' },
  { label: 'Instagram', url: 'https://www.instagram.com/cybotz.experience', icon: 'instagram' },
];

export interface Institution {
  name: string;
  text: string;
  logo?: string;
  url?: string;
}

export const INSTITUTIONS: Institution[] = [
  { name: 'Canadian International School', text: '80 students mentored in advanced tech.', logo: '/logos/canadian_international.png', url: 'https://www.canadianinternationalschool.com' },
  { name: 'Mallya Aditi International School', text: '75 students mentored in robotics & drone tech.', logo: '/logos/mallya_aditi.png', url: 'https://aditi.edu.in' },
  { name: 'New Horizon Public School', text: '99 students trained in robotics ecosystems.', logo: '/logos/new_horizon_public_school.png', url: 'https://nhps.in' },
  { name: 'New Horizon International', text: '36 students mentored in drone dynamics.', logo: '/logos/new_horizon_international.png', url: 'https://newhorizoninternationalschool.in' },
  { name: 'New Horizon Gurukul', text: '60 students guided in fundamental programming.', logo: '/logos/new_horizon_gurukul.png', url: 'https://newhorizongurukul.in' },
  { name: 'Trio World School', text: 'Professional faculty training modules.', logo: '/logos/trio_world.png', url: 'https://www.trioworldschool.com' },
  { name: 'Christ University', text: 'Advanced robotics workshops for faculty & students.', logo: '/logos/christ_university.webp', url: 'https://www.christuniversity.in' },
  { name: 'Ramaiah University of Applied Sciences', text: 'Hands-on drone dynamics & robotics workshops.', logo: '/logos/ruas_logo_dark.webp', url: 'https://www.msruas.ac.in' },
];

export const MENTORS = [
  {
    name: 'Prasanna',
    role: 'Founder & FPV Drone Pilot',
    bio: 'FPV drone pilot and robotics enthusiast. Experienced in building 20+ custom drones, consulting for drone startups, and conducting high-speed drone shows.',
    image: '/images/prasanna_portrait.jpg',
  },
];


