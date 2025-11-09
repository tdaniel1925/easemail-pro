'use client';

import { useState, useMemo } from 'react';
import { 
  Search, Book, Zap, Mail, Users, Calendar, MessageSquare, Settings,
  HelpCircle, PlayCircle, Star, TrendingUp, ChevronRight, RotateCcw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { helpCategories, helpArticles, type HelpArticle, type HelpCategory } from './data/articles';
import ConnectEmailArticle from './articles/ConnectEmailArticle';
import AIWriteArticle from './articles/AIWriteArticle';
import VoiceDictationArticle from './articles/VoiceDictationArticle';
import EmailRulesArticle from './articles/EmailRulesArticle';
import TroubleshootingArticle from './articles/TroubleshootingArticle';
import QuickStartGuide from './QuickStartGuide';
import FAQSection from './FAQSection';
import InteractiveSetupWizard from './InteractiveSetupWizard';

const iconMap: Record<string, any> = {
  PlayCircle, Mail, Zap, Users, Calendar, MessageSquare, Settings, HelpCircle
};

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const router = useRouter();

  const filteredArticles = useMemo(() => {
    let filtered = helpArticles;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const featuredArticles = helpArticles.filter(a => a.featured);
  const popularArticles = [...helpArticles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  if (selectedArticle) {
    // Render article content
    const ArticleComponent = getArticleComponent(selectedArticle.id);
    return (
      <div className="flex h-full">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => setSelectedArticle(null)} className="mb-6">
              <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Help Center
            </Button>
            <h1 className="text-4xl font-bold mb-4">{selectedArticle.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">{selectedArticle.description}</p>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {ArticleComponent ? <ArticleComponent /> : <p>Article content coming soon!</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 overflow-y-auto flex-shrink-0">
        <div className="mb-6">
          <Link 
            href="/settings"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Settings
          </Link>
          <h2 className="text-xl font-bold">Help Center</h2>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedCategory ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <Book className="h-4 w-4" />
            <span>All Articles</span>
          </button>

          {helpCategories.map((category) => {
            const Icon = iconMap[category.icon];
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{category.name}</span>
                <Badge variant="secondary" className="text-xs">{category.articleCount}</Badge>
              </button>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Quick Links</h3>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/inbox?onboarding=restart')}
              className="w-full justify-start"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Tour
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl font-bold mb-2">How can we help you?</h1>
          <p className="text-muted-foreground mb-6">Search our knowledge base or browse categories below</p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help articles, features, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg"
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Articles</TabsTrigger>
              <TabsTrigger value="featured">
                <Star className="h-4 w-4 mr-2" />
                Featured
              </TabsTrigger>
              <TabsTrigger value="popular">
                <TrendingUp className="h-4 w-4 mr-2" />
                Popular
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {!selectedCategory && !searchQuery && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Browse by Category</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {helpCategories.map((category) => {
                      const Icon = iconMap[category.icon];
                      return (
                        <Card key={category.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCategory(category.id)}>
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className={`${category.color} p-3 rounded-lg`}>
                                <Icon className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                                <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                                <Badge variant="secondary">{category.articleCount} articles</Badge>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {(selectedCategory || searchQuery) && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">
                      {searchQuery ? `Search Results (${filteredArticles.length})` : helpCategories.find(c => c.id === selectedCategory)?.name}
                    </h2>
                    {selectedCategory && <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>View All Categories</Button>}
                  </div>

                  {filteredArticles.length === 0 ? (
                    <Card><CardContent className="py-12 text-center"><Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground mb-4">No articles found</p></CardContent></Card>
                  ) : (
                    <div className="space-y-3">
                      {filteredArticles.map((article) => (
                        <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedArticle(article)}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-lg">{article.title}</h3>
                                  {article.featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{article.description}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="capitalize">{article.difficulty}</Badge>
                                  <span>• {article.readTime} read</span>
                                  <span>• {article.helpful}% helpful</span>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="featured" className="space-y-3">
              <h2 className="text-2xl font-bold mb-4">Featured Articles</h2>
              {featuredArticles.map((article) => (
                <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedArticle(article)}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                    <p className="text-sm text-muted-foreground">{article.description}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="popular" className="space-y-3">
              <h2 className="text-2xl font-bold mb-4">Most Popular Articles</h2>
              {popularArticles.map((article, index) => (
                <Card key={article.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedArticle(article)}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-3xl font-bold text-muted-foreground">{index + 1}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                        <p className="text-sm text-muted-foreground">{article.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function getArticleComponent(articleId: string) {
  const components: Record<string, any> = {
    'connect-email-account': ConnectEmailArticle,
    'ai-write-emails': AIWriteArticle,
    'voice-dictation': VoiceDictationArticle,
    'email-rules-guide': EmailRulesArticle,
    'troubleshooting-guide': TroubleshootingArticle,
    'quick-start': QuickStartGuide,
    'faq': FAQSection,
  };
  return components[articleId];
}

