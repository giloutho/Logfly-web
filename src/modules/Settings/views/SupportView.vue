<template>
  <v-card flat class="support-card">
    <!-- Main content centered -->
    <div class="support-content">
      <!-- Icon with gradient background -->
      <div class="icon-container">
        <v-icon size="64" color="white">mdi-headset</v-icon>
      </div>

      <!-- Title and description -->
      <h1 class="support-title">{{ $gettext('Support') }} & {{ $gettext('Contact') }}</h1>
      <p class="support-subtitle">{{ $gettext('Need help') }}? {{ $gettext('Have a question or suggestion') }}?</p>
      <p class="support-description">{{ $gettext('Contact the Logfly support our online form') }}.</p>

      <!-- Main action button -->
      <v-btn color="primary" size="x-large" class="contact-btn" @click="openContactForm">
        <v-icon start>mdi-email-outline</v-icon>
        {{ $gettext('Open Contact Form') }}
        <v-icon end>mdi-open-in-new</v-icon>
      </v-btn>

      <!-- Info cards -->
      <div class="info-cards">
        <div class="info-item">
          <v-icon color="primary" size="28">mdi-github</v-icon>
          <div class="info-text">
            <span class="info-label">{{ $gettext('Bug reports') }}</span>
            <a href="https://github.com/giloutho/Logfly-web/issues" target="_blank" rel="noopener" class="info-link">
              GitHub
            </a>
          </div>
        </div>
        <div class="info-item">
          <v-icon color="primary" size="28">mdi-translate</v-icon>
          <div class="info-text">
            <span class="info-label">{{ $gettext('Languages') }}</span>
            <span class="info-value">{{ $gettext('French') }}, {{ $gettext('English') }}</span>
          </div>
        </div>
      </div>

      <!-- Website link -->
      <div class="website-link">
        <v-icon size="18" color="grey">mdi-web</v-icon>
        <a href="https://logfly.org" target="_blank" rel="noopener">logfly.org</a>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { useGettext } from "vue3-gettext";

const { $gettext } = useGettext();

const contactUrl = 'https://logfly.org/logflydoc/contact/request/';

/**
 * Open contact form in a new browser tab
 */
function openContactForm() {
  window.open(contactUrl, '_blank', 'noopener,noreferrer');
}
</script>

<style scoped>
.support-card {
  width: 100%;
  height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.support-content {
  text-align: center;
  max-width: 600px;
  padding: 40px;
}

.icon-container {
  width: 120px;
  height: 120px;
  margin: 0 auto 24px auto;
  border-radius: 50%;
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 50%, #0D47A1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(25, 118, 210, 0.3);
}

.support-title {
  font-size: 2.2rem;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 12px;
}

.support-subtitle {
  font-size: 1.2rem;
  color: #4a4a6a;
  margin-bottom: 8px;
}

.support-description {
  font-size: 1rem;
  color: #666;
  margin-bottom: 32px;
}

.contact-btn {
  padding: 12px 32px !important;
  font-size: 1.1rem !important;
  border-radius: 12px !important;
  text-transform: none !important;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 16px rgba(25, 118, 210, 0.3) !important;
  transition: transform 0.2s, box-shadow 0.2s !important;
}

.contact-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(25, 118, 210, 0.4) !important;
}

.info-cards {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 48px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.info-label {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}

.info-link {
  font-size: 0.95rem;
  color: #1976D2;
  font-weight: 500;
  text-decoration: none;
}

.info-link:hover {
  text-decoration: underline;
}

.website-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
}

.website-link a {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
}

.website-link a:hover {
  color: #1976D2;
  text-decoration: underline;
}

@media (max-width: 600px) {
  .support-content {
    padding: 24px;
  }

  .icon-container {
    width: 100px;
    height: 100px;
  }

  .icon-container .v-icon {
    font-size: 48px !important;
  }

  .support-title {
    font-size: 1.8rem;
  }

  .info-cards {
    flex-direction: column;
    align-items: center;
  }

  .info-item {
    width: 100%;
    max-width: 280px;
  }
}
</style>