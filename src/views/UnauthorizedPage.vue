<script setup lang="ts">
// This page is shown when a user tries to access the closet app
// directly without a valid auth token from the Dia-Website.
</script>

<template>
  <div class="unauthorized-page">
    <div class="unauthorized-card">
      <div class="icon-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lock-icon"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h1 class="title">Access Restricted</h1>

      <p class="description">
        The Closet Designer can only be accessed from the
        <strong>Dia Kitchen & Bath</strong> portal.
      </p>

      <p class="instruction">
        Please go back to the portal and click
        <span class="highlight">"Design Closet"</span>
        to open the designer.
      </p>

      <div class="divider" />

      <p class="help-text">
        If you believe this is an error, please contact your administrator.
      </p>
    </div>
  </div>
</template>

<style scoped>
.unauthorized-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  padding: 1rem;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.unauthorized-card {
  max-width: 480px;
  width: 100%;
  text-align: center;
  padding: 3rem 2.5rem;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 1rem;
  backdrop-filter: blur(16px);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(148, 163, 184, 0.05);
}

.icon-container {
  margin-bottom: 1.5rem;
}

.lock-icon {
  width: 64px;
  height: 64px;
  color: #f59e0b;
  margin: 0 auto;
  filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.3));
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 1rem;
  letter-spacing: -0.02em;
}

.description {
  font-size: 1rem;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0 0 0.75rem;
}

.description strong {
  color: #cbd5e1;
}

.instruction {
  font-size: 0.95rem;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.highlight {
  color: #a78bfa;
  font-weight: 600;
}

.divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(148, 163, 184, 0.2),
    transparent
  );
  margin: 0 0 1.5rem;
}

.help-text {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
}
</style>
