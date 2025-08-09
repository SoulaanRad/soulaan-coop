import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function LearnScreen() {
  const courses = [
    {
      title: 'Cooperative Economics 101',
      description: 'Learn the fundamentals of cooperative economics and how they build community wealth',
      duration: '45 min',
      level: 'Beginner',
      progress: 0,
      category: 'Economics',
    },
    {
      title: 'Understanding Unity Coin & Soulaan Coin',
      description: 'Master the mechanics of our community currencies and their economic impact',
      duration: '30 min',
      level: 'Beginner',
      progress: 60,
      category: 'Currency',
    },
    {
      title: 'Community Investment Strategies',
      description: 'Learn how to evaluate and vote on community investment proposals',
      duration: '60 min',
      level: 'Intermediate',
      progress: 0,
      category: 'Investment',
    },
    {
      title: 'Building Generational Wealth',
      description: 'Strategies for creating lasting wealth within cooperative communities',
      duration: '90 min',
      level: 'Advanced',
      progress: 25,
      category: 'Wealth Building',
    },
  ];

  const articles = [
    {
      title: 'The Power of Local Currency',
      description: 'How community currencies keep money circulating locally',
      readTime: '5 min read',
      category: 'Economics',
    },
    {
      title: 'Success Stories: Cooperative Enterprises',
      description: 'Real examples of successful cooperative businesses',
      readTime: '8 min read',
      category: 'Case Studies',
    },
    {
      title: 'Democratic Decision Making',
      description: 'Best practices for community governance and voting',
      readTime: '6 min read',
      category: 'Governance',
    },
  ];

  const getLevelColor = (level) => {
    switch (level) {
      case 'Beginner': return '#10B981';
      case 'Intermediate': return '#F59E0B';
      case 'Advanced': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Economics': return '#3B82F6';
      case 'Currency': return '#F59E0B';
      case 'Investment': return '#DC2626';
      case 'Wealth Building': return '#10B981';
      case 'Case Studies': return '#8B5CF6';
      case 'Governance': return '#059669';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Learn</Text>
          <Text style={styles.subtitle}>Master cooperative economics and community wealth building</Text>
        </View>

        {/* Courses Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Courses</Text>
          {courses.map((course, index) => (
            <Card key={index} style={styles.courseCard}>
              <CardContent>
                <View style={styles.courseHeader}>
                  <Badge style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(course.category)}20`, borderColor: getCategoryColor(course.category) }]}>
                    {course.category}
                  </Badge>
                  <Badge style={[styles.levelBadge, { backgroundColor: `${getLevelColor(course.level)}20`, borderColor: getLevelColor(course.level) }]}>
                    {course.level}
                  </Badge>
                </View>
                
                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.courseDescription}>{course.description}</Text>
                
                <View style={styles.courseDetails}>
                  <Text style={styles.duration}>🕐 {course.duration}</Text>
                  {course.progress > 0 && (
                    <Text style={styles.progress}>{course.progress}% complete</Text>
                  )}
                </View>
                
                {course.progress > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${course.progress}%` }]} />
                    </View>
                  </View>
                )}
                
                <TouchableOpacity style={styles.courseButton}>
                  <Text style={styles.courseButtonText}>
                    {course.progress > 0 ? 'Continue' : 'Start Course'}
                  </Text>
                </TouchableOpacity>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Articles Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles & Resources</Text>
          {articles.map((article, index) => (
            <Card key={index} style={styles.articleCard}>
              <CardContent>
                <View style={styles.articleHeader}>
                  <Badge style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(article.category)}20`, borderColor: getCategoryColor(article.category) }]}>
                    {article.category}
                  </Badge>
                  <Text style={styles.readTime}>{article.readTime}</Text>
                </View>
                
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleDescription}>{article.description}</Text>
                
                <TouchableOpacity style={styles.readButton}>
                  <Text style={styles.readButtonText}>Read Article →</Text>
                </TouchableOpacity>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Learning Path */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Learning Path</Text>
          <Card style={styles.pathCard}>
            <CardContent>
              <Text style={styles.pathTitle}>🎯 New to Cooperatives?</Text>
              <Text style={styles.pathDescription}>
                Follow our structured learning path to understand cooperative economics from the ground up.
              </Text>
              
              <View style={styles.pathSteps}>
                {[
                  'Cooperative Economics 101',
                  'Understanding Community Currencies', 
                  'Investment & Governance',
                  'Wealth Building Strategies'
                ].map((step, index) => (
                  <View key={index} style={styles.pathStep}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity style={styles.startPathButton}>
                <Text style={styles.startPathButtonText}>Start Learning Path</Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },

  // Course Cards
  courseCard: {
    marginBottom: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    borderWidth: 1,
  },
  levelBadge: {
    borderWidth: 1,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  courseDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  courseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  duration: {
    fontSize: 14,
    color: '#374151',
  },
  progress: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  courseButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  courseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Article Cards
  articleCard: {
    marginBottom: 16,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  readTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  articleDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  readButton: {
    alignSelf: 'flex-start',
  },
  readButtonText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },

  // Learning Path
  pathCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  pathTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  pathDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  pathSteps: {
    marginBottom: 20,
  },
  pathStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  startPathButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  startPathButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
