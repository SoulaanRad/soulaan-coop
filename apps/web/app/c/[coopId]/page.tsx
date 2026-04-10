import Link from 'next/link';
import { Check, ArrowRight, Users, Target, Shield, Mail, ExternalLink, Store as StoreIcon, FileText, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { env } from '@/env';
import { api } from "@/lib/trpc/client";

interface CoopPageProps {
  params: {
    coopId: string;
  };
}


async function getPublicCoopInfo(coopId: string) {
  if(!coopId) {
    return null;
  }
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const url = `${apiUrl}/publicCoopInfo.getByCoopIdWithUnpublished`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coopId }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch public coop info:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url
      });
      return null;
    }

    const data = await response.json();
    return data.result.data;
  } catch (error) {
    console.error('Error fetching public coop info:', error);
    return null;
  }
}

async function getPreviewData(coopId: string, previewMode: 'live' | 'curated' | 'hybrid') {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const url = `${apiUrl}/publicCoopInfo.getPreviewData`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coopId, previewMode }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch preview data:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.result.data;
  } catch (error) {
    console.error('Error fetching preview data:', error);
    return null;
  }
}

function ComingSoonPage({ coopId, publicInfo }: { coopId: string; publicInfo: any }) {
  // Use branding from unpublished row if available, otherwise use defaults
  const name = publicInfo?.name || coopId;
  const tagline = publicInfo?.tagline || 'Building community wealth together';
  const primaryColor = publicInfo?.primaryColor || '#f59e0b';
  const backgroundColor = publicInfo?.backgroundColor || '#1a1a1a';
  const logoUrl = publicInfo?.logoUrl;

  const primaryStyle = { backgroundColor: primaryColor };
  const bgStyle = { backgroundColor: backgroundColor };

  return (
    <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        {logoUrl && (
          <div className="mb-8 flex justify-center">
            <Image
              src={logoUrl}
              alt={`${name} logo`}
              width={120}
              height={120}
              className="rounded-lg"
            />
          </div>
        )}
        
        <div className="mb-8">
          <div className="inline-block px-6 py-3 rounded-full text-white font-semibold mb-6" style={primaryStyle}>
            Coming Soon
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
          {name}
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 text-gray-300">
          {tagline}
        </p>

        <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
          We&apos;re working on our public page. Check back soon to learn more about our cooperative and how to join our community.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/portal/${coopId}`}
            className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center justify-center transition-all"
          >
            Member Portal
            <ArrowRight className="ml-2" size={20} />
          </Link>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-700">
          <p className="text-gray-500 text-sm">
            Are you an admin? Visit the{' '}
            <Link href={`/portal/${coopId}/settings/public-page`} className="underline hover:text-gray-400">
              portal settings
            </Link>
            {' '}to set up your public page.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function CoopPublicPage({ params }: CoopPageProps) {
  const { coopId } = await params;
  console.log('check coopId', coopId);
  const publicInfo = await getPublicCoopInfo(coopId);

  // Show coming soon page if missing or unpublished
  if (!publicInfo?.isPublished) {
    return <ComingSoonPage coopId={coopId} publicInfo={publicInfo} />;
  }

  const features = (publicInfo.features as { title: string; description: string; iconName?: string }[]) || [];
  const faqs = (publicInfo.faqs as { question: string; answer: string }[]) || [];
  const contactLinks = (publicInfo.contactLinks as { label: string; url: string; type?: string }[]) || [];
  
  const previewData = await getPreviewData(coopId, publicInfo.previewMode);
  const previewOverrides = publicInfo.previewOverrides as { stores?: any[]; proposals?: any[]; stats?: any } | null;

  const bgStyle = { backgroundColor: publicInfo.backgroundColor };
  const primaryStyle = { backgroundColor: publicInfo.primaryColor };
  const accentStyle = { backgroundColor: publicInfo.accentColor };

  return (
    <div className="min-h-screen" style={bgStyle}>
      {/* Hero Section */}
      <div className="relative text-white" style={primaryStyle}>
        {publicInfo.coverImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <Image
              src={publicInfo.coverImageUrl}
              alt="Cover"
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {publicInfo.logoUrl && (
              <div className="mb-6 flex justify-center">
                <Image
                  src={publicInfo.logoUrl}
                  alt={`${publicInfo.name} logo`}
                  width={120}
                  height={120}
                  className="rounded-lg"
                />
              </div>
            )}
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {publicInfo.heroTitle || publicInfo.name || coopId}
            </h1>
            {(publicInfo.heroSubtitle || publicInfo.tagline) && (
              <p className="text-xl md:text-2xl mb-8 text-gray-100">
                {publicInfo.heroSubtitle || publicInfo.tagline}
              </p>
            )}
            {publicInfo.heroImageUrl && (
              <div className="mb-10 relative h-64 rounded-xl overflow-hidden">
                <Image
                  src={publicInfo.heroImageUrl}
                  alt="Hero"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={publicInfo.primaryCtaUrl || publicInfo.mobileAppUrl || `https://mobile.cahootzcoops.com`}
                className="hover:opacity-90 text-white px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center justify-center transition-all"
                style={accentStyle}
              >
                {publicInfo.primaryCtaLabel || 'Join Now'}
                <ArrowRight className="ml-2" size={20} />
              </Link>
              <Link
                href={`/portal/${coopId}`}
                className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg inline-flex items-center justify-center transition-all"
              >
                Member Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      {publicInfo.aboutBody && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {publicInfo.aboutTitle || 'About Us'}
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {publicInfo.aboutBody}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mission Section */}
      {publicInfo.missionBody && (
        <div className="bg-gray-50 dark:bg-gray-900 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <Target className="w-12 h-12 mx-auto mb-4" style={{ color: publicInfo.primaryColor }} />
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Our Mission
                </h2>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {publicInfo.missionBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      {features.length > 0 && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Join {publicInfo.name}?
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={accentStyle}>
                    <Check className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Eligibility Section */}
      {publicInfo.eligibilityBody && (
        <div className="bg-gray-50 dark:bg-gray-900 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: publicInfo.accentColor }} />
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {publicInfo.eligibilityTitle || 'Who Can Join'}
                </h2>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {publicInfo.eligibilityBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Section - Hybrid: Live data + curated overrides */}
      {(previewData || previewOverrides) && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                See What&apos;s Happening
              </h2>
            </div>

            {/* Stores Preview */}
            {(previewData?.stores.length || previewOverrides?.stores?.length) ? (
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <StoreIcon size={24} style={{ color: publicInfo.primaryColor }} />
                  Local Stores
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {(previewOverrides?.stores || previewData?.stores || []).slice(0, 3).map((store: any, index: number) => (
                    <div key={store.id || index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                      {store.imageUrl && (
                        <div className="relative h-40 mb-4 rounded-lg overflow-hidden">
                          <Image
                            src={store.imageUrl}
                            alt={store.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {store.name}
                      </h4>
                      {store.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {store.description}
                        </p>
                      )}
                      {store.category && (
                        <span className="inline-block mt-3 px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {store.category}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Proposals Preview */}
            {(previewData?.proposals.length || previewOverrides?.proposals?.length) ? (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <FileText size={24} style={{ color: publicInfo.primaryColor }} />
                  Recent Proposals
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {(previewOverrides?.proposals || previewData?.proposals || []).slice(0, 3).map((proposal: any, index: number) => (
                    <div key={proposal.id || index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full text-white" style={accentStyle}>
                          {proposal.status}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {proposal.title}
                      </h4>
                      {proposal.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                          {proposal.summary}
                        </p>
                      )}
                      {proposal.budgetAmount && (
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Budget: {proposal.budgetCurrency} ${proposal.budgetAmount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Stats Preview */}
            {previewOverrides?.stats && (
              <div className="mt-12 grid md:grid-cols-3 gap-6">
                {previewOverrides.stats.totalMembers && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3" style={{ color: publicInfo.primaryColor }} />
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {previewOverrides.stats.totalMembers}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Members</p>
                  </div>
                )}
                {previewOverrides.stats.totalStores && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
                    <StoreIcon className="w-12 h-12 mx-auto mb-3" style={{ color: publicInfo.primaryColor }} />
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {previewOverrides.stats.totalStores}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Local Stores</p>
                  </div>
                )}
                {previewOverrides.stats.totalFunded && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: publicInfo.primaryColor }} />
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${previewOverrides.stats.totalFunded.toLocaleString()}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Funded</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Section */}
      {(publicInfo.contactEmail || contactLinks.length > 0 || publicInfo.newsletterUrl) && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Mail className="w-12 h-12 mx-auto mb-4" style={{ color: publicInfo.primaryColor }} />
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Get In Touch
              </h2>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              {publicInfo.contactEmail && (
                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300">
                    Email us at:{' '}
                    <a
                      href={`mailto:${publicInfo.contactEmail}`}
                      className="font-semibold hover:underline"
                      style={{ color: publicInfo.primaryColor }}
                    >
                      {publicInfo.contactEmail}
                    </a>
                  </p>
                </div>
              )}
              {contactLinks.length > 0 && (
                <div className="flex flex-wrap gap-4 mb-6">
                  {contactLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <ExternalLink size={16} />
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
              {publicInfo.newsletterUrl && (
                <div>
                  <Link
                    href={publicInfo.newsletterUrl}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white hover:opacity-90 transition-all"
                    style={primaryStyle}
                  >
                    Subscribe to Newsletter
                    <ArrowRight size={18} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Final CTA Section */}
      <div className="text-white py-16" style={primaryStyle}>
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Users className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Join Our Community?
            </h2>
            <p className="text-xl mb-8 text-gray-100">
              {publicInfo.tagline || `Become a member of ${publicInfo.name || coopId}`}
            </p>
            <Link
              href={publicInfo.primaryCtaUrl || publicInfo.mobileAppUrl || `https://mobile.cahootzcoops.com`}
              className="hover:opacity-90 text-white px-10 py-5 rounded-lg font-semibold text-xl inline-flex items-center justify-center transition-all"
              style={accentStyle}
            >
              {publicInfo.primaryCtaLabel || 'Get Started'}
              <ArrowRight className="ml-2" size={24} />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} {publicInfo.name || coopId}. All rights reserved.</p>
          <div className="mt-4 space-x-6">
            <Link href={`/portal/${coopId}`} className="hover:text-white transition-colors">
              Member Portal
            </Link>
            <Link href={`/portal/${coopId}/proposals`} className="hover:text-white transition-colors">
              Proposals
            </Link>
            <Link href={`/portal/${coopId}/stores`} className="hover:text-white transition-colors">
              Stores
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export async function generateMetadata({ params }: CoopPageProps) {
  const { coopId } = await params;
  const publicInfo = await getPublicCoopInfo(coopId);

  // Handle missing or unpublished pages
  if (!publicInfo?.isPublished) {
    const name = publicInfo?.name || coopId;
    return {
      title: `${name} - Coming Soon`,
      description: publicInfo?.tagline || `${name} is building their cooperative community. Check back soon to learn more.`,
    };
  }

  return {
    title: publicInfo.seoTitle || publicInfo.name || coopId,
    description: publicInfo.seoDescription || publicInfo.tagline || publicInfo.aboutBody || `Join ${publicInfo.name || coopId}`,
  };
}
