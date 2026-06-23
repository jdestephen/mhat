import { Shield, Users, Activity, FileText, Smartphone, Lock } from "lucide-react";

const features = [
  {
    name: "Patient-Controlled Data",
    description: "You own your data. Decide exactly what information to share and with whom, putting you in the driver's seat of your healthcare journey.",
    icon: Shield,
    color: "bg-blue-50 text-blue-600",
  },
  {
    name: "Family Management",
    description: "Manage medical records for your entire family from a single account. Perfect for parents keeping track of their children's health histories.",
    icon: Users,
    color: "bg-teal-50 text-teal-600",
  },
  {
    name: "Seamless Doctor Collaboration",
    description: "Share your complete medical history with new or existing doctors instantly, reducing redundant paperwork and improving care quality.",
    icon: Activity,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "Comprehensive Records",
    description: "Store allergies, medications, past surgeries, and ongoing conditions. Never forget an important medical detail again.",
    icon: FileText,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    name: "Access Anywhere",
    description: "Your health information is securely accessible from any device, whether you're at home or in the emergency room.",
    icon: Smartphone,
    color: "bg-purple-50 text-purple-600",
  },
  {
    name: "Privacy First",
    description: "Built with industry-leading security practices to ensure your sensitive medical information remains private and protected at all times.",
    icon: Lock,
    color: "bg-slate-100 text-slate-700",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-teal-600 font-semibold tracking-wide uppercase text-sm mb-3">Why Choose Numa</h2>
          <p className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Everything you need to manage your health
          </p>
          <p className="text-lg text-slate-600">
            We've built a comprehensive platform that simplifies how you store, track, and share your medical history.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-md hover:border-teal-100 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.name}</h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
