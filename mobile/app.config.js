module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EAS_BUILD_PROFILE === 'production' && (!apiUrl || !apiUrl.startsWith('https://'))) {
    throw new Error('Production builds require an HTTPS EXPO_PUBLIC_API_URL.');
  }
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ['expo-build-properties', { android: { usesCleartextTraffic: !apiUrl || apiUrl.startsWith('http://') } }],
    ],
  };
};
