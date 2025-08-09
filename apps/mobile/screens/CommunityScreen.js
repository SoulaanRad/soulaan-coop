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
import { Badge } from '../components/ui/Badge';

export default function CommunityScreen() {
  const [activeSection, setActiveSection] = useState('businesses');

  const communityBusinesses = [
    {
      name: "Maya's Soul Kitchen",
      category: 'Restaurant',
      description: 'Authentic soul food made with love and local ingredients',
      acceptsUC: true,
      acceptsSC: false,
      rating: 4.8,
      distance: '0.3 miles',
      rewardRate: '5% UC back',
    },
    {
      name: 'Black Tech Repairs',
      category: 'Electronics',
      description: 'Phone, laptop, and electronics repair service',
      acceptsUC: true,
      acceptsSC: true,
      rating: 4.9,
      distance: '0.7 miles',
      rewardRate: '3% UC back',
    },
    {
      name: 'Community Cuts Barbershop',
      category: 'Personal Care',
      description: 'Professional haircuts and grooming services',
      acceptsUC: true,
      acceptsSC: false,
      rating: 4.7,
      distance: '0.5 miles',
      rewardRate: '4% UC back',
    },
  ];

  const communityMembers = [
    {
      name: 'Marcus Johnson',
      role: 'Community Builder',
      contributions: 12,
      joined: '6 months ago',
      expertise: 'Urban Planning',
    },
    {
      name: 'Keisha Williams',
      role: 'Business Advocate',
      contributions: 8,
      joined: '4 months ago',
      expertise: 'Small Business',
    },
    {
      name: 'DeShawn Davis',
      role: 'Tech Mentor',
      contributions: 15,
      joined: '8 months ago',
      expertise: 'Technology',
    },
  ];

  const events = [
    {
      title: 'Community Business Fair',
      date: 'This Saturday',
      time: '10:00 AM - 4:00 PM',
      location: 'Community Center',
      attendees: 47,
    },
    {
      title: 'Financial Literacy Workshop',
      date: 'Next Tuesday',
      time: '6:00 PM - 8:00 PM',
      location: 'Maya\'s Soul Kitchen',
      attendees: 23,
    },
  ];

  const renderBusinesses = () => (
    <View style={styles.sectionContent}>
      {communityBusinesses.map((business, index) => (
        <Card key={index} style={styles.businessCard}>
          <CardContent>
            <View style={styles.businessHeader}>
              <View style={styles.businessInfo}>
                <Text style={styles.businessName}>{business.name}</Text>
                <Text style={styles.businessCategory}>{business.category}</Text>
              </View>
              <View style={styles.businessBadges}>
                {business.acceptsUC && (
                  <Badge style={styles.ucBadge}>UC</Badge>
                )}
                {business.acceptsSC && (
                  <Badge style={styles.scBadge}>SC</Badge>
                )}
              </View>
            </View>
            
            <Text style={styles.businessDescription}>{business.description}</Text>
            
            <View style={styles.businessDetails}>
              <Text style={styles.rating}>⭐ {business.rating}</Text>
              <Text style={styles.distance}>📍 {business.distance}</Text>
              <Text style={styles.reward}>{business.rewardRate}</Text>
            </View>
            
            <Button style={styles.shopButton}>
              Shop Now
            </Button>
          </CardContent>
        </Card>
      ))}
    </View>
  );

  const renderMembers = () => (
    <View style={styles.sectionContent}>
      {communityMembers.map((member, index) => (
        <Card key={index} style={styles.memberCard}>
          <CardContent>
            <View style={styles.memberHeader}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Badge style={styles.roleBadge}>{member.role}</Badge>
              </View>
              <Text style={styles.contributions}>{member.contributions} contributions</Text>
            </View>
            
            <View style={styles.memberDetails}>
              <Text style={styles.expertise}>💡 {member.expertise}</Text>
              <Text style={styles.joinDate}>📅 Joined {member.joined}</Text>
            </View>
            
            <Button style={styles.connectButton}>
              Connect
            </Button>
          </CardContent>
        </Card>
      ))}
    </View>
  );

  const renderEvents = () => (
    <View style={styles.sectionContent}>
      {events.map((event, index) => (
        <Card key={index} style={styles.eventCard}>
          <CardContent>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventDetails}>
              <Text style={styles.eventDate}>📅 {event.date}</Text>
              <Text style={styles.eventTime}>🕐 {event.time}</Text>
              <Text style={styles.eventLocation}>📍 {event.location}</Text>
              <Text style={styles.eventAttendees}>👥 {event.attendees} attending</Text>
            </View>
            <Button style={styles.attendButton}>
              Attend Event
            </Button>
          </CardContent>
        </Card>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>Connect with local businesses and members</Text>
        </View>

        {/* Section Tabs */}
        <View style={styles.tabContainer}>
          {[
            { id: 'businesses', label: 'Businesses', icon: '🏪' },
            { id: 'members', label: 'Members', icon: '👥' },
            { id: 'events', label: 'Events', icon: '📅' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeSection === tab.id && styles.activeTab
              ]}
              onPress={() => setActiveSection(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.tabText,
                activeSection === tab.id && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeSection === 'businesses' && renderBusinesses()}
        {activeSection === 'members' && renderMembers()}
        {activeSection === 'events' && renderEvents()}
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
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },

  // Content
  sectionContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for bottom tabs
  },

  // Business Cards
  businessCard: {
    marginBottom: 16,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  businessBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  ucBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  scBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  businessDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  businessDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  rating: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  distance: {
    fontSize: 12,
    color: '#6B7280',
  },
  reward: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  shopButton: {
    backgroundColor: '#DC2626',
  },

  // Member Cards
  memberCard: {
    marginBottom: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0EA5E9',
    alignSelf: 'flex-start',
  },
  contributions: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  memberDetails: {
    marginBottom: 12,
    gap: 4,
  },
  expertise: {
    fontSize: 14,
    color: '#374151',
  },
  joinDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  connectButton: {
    backgroundColor: '#0EA5E9',
  },

  // Event Cards
  eventCard: {
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 12,
    gap: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#374151',
  },
  eventTime: {
    fontSize: 14,
    color: '#374151',
  },
  eventLocation: {
    fontSize: 14,
    color: '#374151',
  },
  eventAttendees: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  attendButton: {
    backgroundColor: '#F59E0B',
  },
});
