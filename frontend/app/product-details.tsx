import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';
const { width } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { token } = useAuth();
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadProductDetails();
  }, [id]);

  const loadProductDetails = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/admin/products`, { headers });
      const foundProduct = response.data.find(p => p._id === id);
      
      if (foundProduct) {
        // Add placeholder images if not present
        if (!foundProduct.images || foundProduct.images.length === 0) {
          foundProduct.images = [
            foundProduct.imageUrl || getPlaceholderImage(foundProduct.category),
            getPlaceholderImage(foundProduct.category),
            getPlaceholderImage(foundProduct.category),
          ];
        }
        
        // Add features if not present
        if (!foundProduct.features) {
          foundProduct.features = generateDemoFeatures(foundProduct.category);
        }
        
        // Add specifications if not present
        if (!foundProduct.specifications) {
          foundProduct.specifications = generateDemoSpecifications(foundProduct.category);
        }
        
        setProduct(foundProduct);
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceholderImage = (category) => {
    const placeholders = {
      'Cryotherapy': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
      'Red Light Therapy': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
      'Hyperbaric Chamber': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
      'IV Therapy': 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800',
      'Infrared Sauna': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    };
    return placeholders[category] || 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800';
  };

  const generateDemoFeatures = (category) => {
    const features = {
      'Cryotherapy': [
        { icon: 'snow', title: 'Ultra-Cold Technology', description: 'Reaches -110°C to -140°C for maximum effectiveness' },
        { icon: 'flash', title: 'Rapid Recovery', description: 'Accelerates muscle recovery and reduces inflammation' },
        { icon: 'shield-checkmark', title: 'Safe & Controlled', description: 'Advanced safety systems with real-time monitoring' },
        { icon: 'timer', title: '2-3 Minute Sessions', description: 'Quick and efficient treatment sessions' },
        { icon: 'body', title: 'Full Body Treatment', description: 'Whole-body cryotherapy chamber' },
        { icon: 'fitness', title: 'Athletic Performance', description: 'Boosts endurance and performance' },
      ],
      'Red Light Therapy': [
        { icon: 'bulb', title: 'Medical-Grade LEDs', description: 'Clinically proven wavelengths (630-850nm)' },
        { icon: 'cellular', title: 'Cellular Rejuvenation', description: 'Enhances mitochondrial function' },
        { icon: 'sunny', title: 'Skin Health', description: 'Reduces wrinkles and improves complexion' },
        { icon: 'heart', title: 'Pain Relief', description: 'Natural pain management and healing' },
        { icon: 'time', title: 'Quick Sessions', description: '10-20 minute treatment sessions' },
        { icon: 'checkmark-circle', title: 'FDA Approved', description: 'Clinically tested and approved' },
      ],
    };
    
    return features[category] || [
      { icon: 'star', title: 'Premium Quality', description: 'Top-tier wellness technology' },
      { icon: 'medkit', title: 'Health Benefits', description: 'Scientifically proven results' },
      { icon: 'shield', title: 'Safe to Use', description: 'Certified and tested equipment' },
    ];
  };

  const generateDemoSpecifications = (category) => {
    return {
      'Dimensions': '200cm x 100cm x 220cm',
      'Weight': '350 kg',
      'Power': '220V, 50/60Hz',
      'Treatment Time': '2-20 minutes',
      'Warranty': '2 years comprehensive',
      'Certification': 'FDA, CE, ISO certified',
    };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#556B2F" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF6B35" />
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: product.name,
          headerStyle: { backgroundColor: '#FAF0DC' },
          headerTintColor: '#1A1A1A',
        }}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {product.images.map((image, index) => (
              <View key={index} style={styles.imageSlide}>
                <Image
                  source={{ uri: image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)']}
                  style={styles.imageGradient}
                />
              </View>
            ))}
          </ScrollView>
          
          {/* Image Indicators */}
          <View style={styles.indicators}>
            {product.images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  activeImageIndex === index && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{product.category}</Text>
          </View>
          
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.description}</Text>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={24} color="#556B2F" />
            <Text style={styles.sectionTitle}>Key Features</Text>
          </View>
          
          <View style={styles.featuresGrid}>
            {product.features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon} size={24} color="#556B2F" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Specifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color="#556B2F" />
            <Text style={styles.sectionTitle}>Specifications</Text>
          </View>
          
          <View style={styles.specsContainer}>
            {Object.entries(product.specifications).map(([key, value], index) => (
              <View key={index} style={styles.specRow}>
                <Text style={styles.specLabel}>{key}</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={24} color="#556B2F" />
            <Text style={styles.sectionTitle}>Health Benefits</Text>
          </View>
          
          <View style={styles.benefitsContainer}>
            {[
              'Enhanced muscle recovery and reduced inflammation',
              'Improved sleep quality and circadian rhythm',
              'Boosted immune system function',
              'Increased energy levels and mental clarity',
              'Anti-aging and skin rejuvenation',
              'Natural pain relief and healing',
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color="#8FBC8F" />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <LinearGradient
            colors={['#556B2F', '#8FBC8F']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="call" size={24} color="#FFF" />
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Interested in this device?</Text>
              <Text style={styles.ctaSubtitle}>Contact our team for more information</Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF0DC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF0DC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#556B2F',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF0DC',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF6B35',
  },
  content: {
    backgroundColor: '#FAF0DC',
  },
  imageGallery: {
    height: 300,
    backgroundColor: '#000',
    position: 'relative',
  },
  imageSlide: {
    width: width,
    height: 300,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  indicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: '#FFF',
    width: 24,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0E6D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#556B2F',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  productDescription: {
    fontSize: 16,
    color: '#4A4A4A',
    lineHeight: 24,
  },
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#F0E6D0',
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  specsContainer: {
    gap: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C0',
  },
  specLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  specValue: {
    fontSize: 14,
    color: '#4A4A4A',
  },
  benefitsContainer: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  ctaContainer: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
});
