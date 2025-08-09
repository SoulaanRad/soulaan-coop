import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export default function SupportScreen() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [message, setMessage] = useState('');

  const supportCategories = [
    { id: 'technical', label: 'Technical Issues', icon: '🔧' },
    { id: 'account', label: 'Account Help', icon: '👤' },
    { id: 'payments', label: 'Payments & Wallet', icon: '💳' },
    { id: 'proposals', label: 'Proposals & Voting', icon: '🗳️' },
    { id: 'community', label: 'Community Questions', icon: '👥' },
    { id: 'other', label: 'Other', icon: '💬' },
  ];

  const faqs = [
    {
      question: 'How do Unity Coins (UC) work?',
      answer: 'Unity Coins are our community currency designed to keep money circulating locally. You earn UC by participating in community activities and can spend them at participating businesses.',
    },
    {
      question: 'What is the difference between UC and SC?',
      answer: 'Unity Coins (UC) are for community spending, while Soulaan Coins (SC) are focused on wealth building and community investment returns.',
    },
    {
      question: 'How do I vote on proposals?',
      answer: 'Navigate to the Proposals tab, review active proposals, and use the "Vote & Fund" button to cast your vote and optionally contribute funding.',
    },
    {
      question: 'Can I withdraw my coins to regular currency?',
      answer: 'Yes, you can convert your coins back to USD through our exchange feature, though we encourage keeping value within the community ecosystem.',
    },
  ];

  const contactMethods = [
    {
      method: 'Community Chat',
      description: 'Get help from community members',
      icon: '💬',
      action: 'Join Chat',
    },
    {
      method: 'Video Call',
      description: 'Schedule a 1-on-1 support call',
      icon: '📹',
      action: 'Schedule Call',
    },
    {
      method: 'Email Support',
      description: 'Send us a detailed message',
      icon: '📧',
      action: 'Send Email',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.subtitle}>We're here to help you succeed in the cooperative economy</Text>
        </View>

        {/* Quick Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get Quick Help</Text>
          {contactMethods.map((method, index) => (
            <Card key={index} style={styles.contactCard}>
              <CardContent>
                <View style={styles.contactMethod}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactIcon}>{method.icon}</Text>
                    <View style={styles.contactText}>
                      <Text style={styles.contactTitle}>{method.method}</Text>
                      <Text style={styles.contactDescription}>{method.description}</Text>
                    </View>
                  </View>
                  <Button style={styles.contactButton}>
                    {method.action}
                  </Button>
                </View>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send Us a Message</Text>
          <Card style={styles.formCard}>
            <CardContent>
              <Text style={styles.formLabel}>What can we help you with?</Text>
              <View style={styles.categoryGrid}>
                {supportCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.id && styles.selectedCategory
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === category.id && styles.selectedCategoryText
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Describe your question or issue</Text>
              <Input
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what's happening and how we can help..."
                multiline
                numberOfLines={4}
                style={styles.messageInput}
              />

              <Button 
                style={styles.submitButton}
                disabled={!selectedCategory || !message.trim()}
              >
                Send Message
              </Button>
            </CardContent>
          </Card>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <Card key={index} style={styles.faqCard}>
              <CardContent>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </CardContent>
            </Card>
          ))}
        </View>

        {/* Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          <Card style={styles.resourceCard}>
            <CardContent>
              <View style={styles.resourceLinks}>
                <TouchableOpacity style={styles.resourceLink}>
                  <Text style={styles.resourceIcon}>📚</Text>
                  <Text style={styles.resourceText}>User Guide</Text>
                  <Text style={styles.resourceArrow}>→</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.resourceLink}>
                  <Text style={styles.resourceIcon}>🎥</Text>
                  <Text style={styles.resourceText}>Video Tutorials</Text>
                  <Text style={styles.resourceArrow}>→</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.resourceLink}>
                  <Text style={styles.resourceIcon}>🏛️</Text>
                  <Text style={styles.resourceText}>Co-op Charter</Text>
                  <Text style={styles.resourceArrow}>→</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.resourceLink}>
                  <Text style={styles.resourceIcon}>📋</Text>
                  <Text style={styles.resourceText}>Terms of Service</Text>
                  <Text style={styles.resourceArrow}>→</Text>
                </TouchableOpacity>
              </View>
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

  // Contact Methods
  contactCard: {
    marginBottom: 12,
  },
  contactMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Contact Form
  formCard: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  selectedCategory: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#DC2626',
  },

  // FAQ
  faqCard: {
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  // Resources
  resourceCard: {
    marginBottom: 100, // Extra space for bottom tabs
  },
  resourceLinks: {
    gap: 16,
  },
  resourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resourceIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  resourceText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  resourceArrow: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: 'bold',
  },
});
