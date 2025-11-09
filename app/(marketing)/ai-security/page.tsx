'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Shield,
  Lock,
  Eye,
  Key,
  Server,
  FileCheck,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Database,
  Cloud,
  ShieldCheck,
  FileKey,
  Brain,
  Sparkles
} from 'lucide-react';

export default function AISecurityPage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-500/10 via-blue-500/10 to-background">
        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-semibold">Enterprise-Grade Security</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              AI-Powered,
              <br />
              <span className="text-primary">Privacy-First</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Advanced AI capabilities with uncompromising security and privacy. Your data remains yours—always encrypted, never used for training.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8 gap-2">
                  Start Secure Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/ai-features">
                <Button size="lg" variant="outline" className="text-lg px-8 gap-2">
                  <Sparkles className="h-5 w-5" />
                  Explore AI Features
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Security Principles */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Our Security Commitment
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We built EaseMail with security and privacy as foundational principles, not afterthoughts.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Lock,
              title: 'End-to-End Encryption',
              description: 'All data encrypted in transit and at rest using AES-256 encryption'
            },
            {
              icon: Eye,
              title: 'Zero Knowledge',
              description: 'We can\'t read your emails. You control your encryption keys'
            },
            {
              icon: Server,
              title: 'Secure Infrastructure',
              description: 'SOC 2 Type II certified data centers with 24/7 monitoring'
            },
            {
              icon: FileCheck,
              title: 'Regular Audits',
              description: 'Independent security audits and penetration testing quarterly'
            }
          ].map((principle, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <principle.icon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{principle.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {principle.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Privacy */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Brain className="h-5 w-5" />
                <span className="font-semibold">AI Privacy</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Your Data Never Trains Our AI
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Unlike many AI-powered tools, we never use your email content to train our models. Your communications remain completely private and confidential.
              </p>
              <div className="space-y-4">
                {[
                  {
                    title: 'Real-Time Processing Only',
                    desc: 'AI processes your requests in real-time and immediately discards processed data'
                  },
                  {
                    title: 'No Content Storage',
                    desc: 'Your email content is never stored on our AI processing servers'
                  },
                  {
                    title: 'Anonymized Analytics',
                    desc: 'Only anonymized, aggregated usage metrics help us improve features'
                  },
                  {
                    title: 'Opt-Out Anytime',
                    desc: 'Complete control to disable AI features individually or entirely'
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{feature.title}</p>
                      <p className="text-sm text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Card className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold mb-6">How Our AI Works</h3>
                <div className="space-y-4">
                  {[
                    { step: '1', text: 'You request AI assistance', icon: UserCheck },
                    { step: '2', text: 'Request sent encrypted to AI server', icon: Lock },
                    { step: '3', text: 'AI processes in isolated environment', icon: Brain },
                    { step: '4', text: 'Result returned and encrypted', icon: FileKey },
                    { step: '5', text: 'All temporary data immediately deleted', icon: FileCheck }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-white/50 dark:bg-black/20">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 text-purple-600" />
                          <p className="text-sm font-medium">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-muted-foreground">
                    <strong>Result:</strong> You get AI-powered assistance without compromising your privacy.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enterprise-Grade Data Protection
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Multiple layers of security protect your data at every stage
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Cloud,
              title: 'In Transit',
              features: [
                'TLS 1.3 encryption',
                'Perfect forward secrecy',
                'Certificate pinning',
                'No downgrade attacks'
              ]
            },
            {
              icon: Database,
              title: 'At Rest',
              features: [
                'AES-256 encryption',
                'Encrypted backups',
                'Secure key management',
                'Hardware security modules'
              ]
            },
            {
              icon: ShieldCheck,
              title: 'In Use',
              features: [
                'Encrypted memory',
                'Isolated processing',
                'Secure enclaves',
                'Zero-knowledge architecture'
              ]
            }
          ].map((layer, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <layer.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-xl">{layer.title}</h3>
                </div>
                <ul className="space-y-3">
                  {layer.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Compliance & Certifications
              </h2>
              <p className="text-lg text-muted-foreground">
                We meet the highest industry standards for data protection and privacy
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: 'GDPR Compliant',
                  description: 'Full compliance with EU General Data Protection Regulation. Data residency options in EU available.'
                },
                {
                  title: 'CCPA Compliant',
                  description: 'California Consumer Privacy Act compliant with complete data access and deletion controls.'
                },
                {
                  title: 'SOC 2 Type II',
                  description: 'Independent audit of security, availability, and confidentiality controls.'
                },
                {
                  title: 'HIPAA Ready',
                  description: 'Business Associate Agreements available for healthcare organizations.'
                },
                {
                  title: 'ISO 27001',
                  description: 'Information security management system certification.'
                },
                {
                  title: 'Privacy Shield',
                  description: 'Framework for trans-atlantic data transfer compliance.'
                }
              ].map((cert, index) => (
                <div key={index} className="flex items-start gap-4 p-6 rounded-lg border bg-card">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{cert.title}</h3>
                    <p className="text-sm text-muted-foreground">{cert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Advanced Security Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Additional security controls for enterprise teams
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Key,
              title: 'Two-Factor Authentication',
              description: 'Support for TOTP, SMS, and hardware security keys for account protection.'
            },
            {
              icon: UserCheck,
              title: 'Single Sign-On (SSO)',
              description: 'SAML 2.0 and OAuth 2.0 integration with enterprise identity providers.'
            },
            {
              icon: FileCheck,
              title: 'Audit Logs',
              description: 'Comprehensive logging of all user actions and system events for compliance.'
            },
            {
              icon: AlertTriangle,
              title: 'Anomaly Detection',
              description: 'AI-powered detection of unusual account activity and potential threats.'
            },
            {
              icon: Lock,
              title: 'Role-Based Access',
              description: 'Granular permissions and access controls for team management.'
            },
            {
              icon: Server,
              title: 'Data Residency',
              description: 'Choose where your data is stored to meet regulatory requirements.'
            }
          ].map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Security Best Practices */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Our Security Practices
              </h2>
              <p className="text-lg text-muted-foreground">
                How we maintain the highest security standards
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  title: 'Regular Security Audits',
                  description: 'Independent third-party security audits conducted quarterly with full penetration testing.'
                },
                {
                  title: 'Incident Response Plan',
                  description: '24/7 security operations center with documented incident response procedures.'
                },
                {
                  title: 'Employee Training',
                  description: 'All employees undergo regular security awareness and best practices training.'
                },
                {
                  title: 'Vulnerability Management',
                  description: 'Continuous scanning and patching of systems with bug bounty program.'
                },
                {
                  title: 'Secure Development',
                  description: 'Security built into every stage of development with code review and testing.'
                },
                {
                  title: 'Data Backup',
                  description: 'Encrypted, redundant backups with regular restoration testing.'
                }
              ].map((practice, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{practice.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{practice.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <Shield className="h-5 w-5" />
              <span className="font-semibold">Security Researchers Welcome</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Responsible Disclosure Program
            </h2>
            <p className="text-lg text-muted-foreground">
              We welcome security researchers to help us maintain the highest security standards. Report vulnerabilities responsibly and we'll work with you to address them promptly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" variant="outline" className="gap-2">
                <Shield className="h-5 w-5" />
                Report Security Issue
              </Button>
              <Button size="lg" variant="outline" className="gap-2">
                <FileCheck className="h-5 w-5" />
                View Security Policy
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">
              Security You Can Trust
            </h2>
            <p className="text-xl text-white/90">
              Experience AI-powered email with enterprise-grade security and privacy protection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Start Secure Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 border-white/20 hover:bg-white/20 text-white">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
