import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  dailyChallenges,
  friendChallenges,
  remoteViewingOptions,
  remoteViewingTarget
} from "./src/data/mockData";
import { createStripeCheckoutSession, premiumPlan } from "./src/services/subscriptions";
import { formatDuration, loadAdminAnalyticsReport } from "./src/services/adminAnalytics";
import { backendUserInsightsCsvUrl, loadAdminSecret, loadBackendAdminReport, loadBackendSyncLog, saveAdminSecret, syncDailyAnswers, syncProfile } from "./src/services/backendApi";
import { DailyChallengeHub } from "./src/components/DailyChallengeHub";
import { UserProfile } from "./src/types/userProfile";

const { scoreDailyChallenge } = require("./src/domain/scoringCore");

type TabKey = "today" | "remote" | "friends" | "premium" | "admin";
type Answers = Record<string, string>;
const profilesKey = "intuisity-user-profiles";
const activeProfileKey = "intuisity-active-profile";
const dailyAnswersKeyPrefix = "intuisity-daily-answers";
const supportedLanguages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Mandarin Chinese", nativeName: "中文" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ur", name: "Urdu", nativeName: "اردو" }
];
const usStates = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming", "District of Columbia"
];

const rewardImages = [
  require("./assets/intuition-hero.png"),
  require("./assets/reward-lake.png"),
  require("./assets/reward-waterfall.png")
];

const knowingColors: Record<string, string> = {
  Red: "#EF4444",
  Green: "#22A968",
  Yellow: "#F4C542",
  Blue: "#3274E8"
};

const tabs: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "today", label: "Today", icon: "sparkles-outline" },
  { key: "friends", label: "Friends", icon: "people-outline" },
  { key: "premium", label: "Premium", icon: "card-outline" },
  { key: "admin", label: "Admin", icon: "shield-checkmark-outline" }
];

const tabTranslations: Record<string, Record<TabKey | "score", string>> = {
  en: { today: "Today", remote: "Remote", friends: "Friends", premium: "Premium", admin: "Admin", score: "Score" },
  zh: { today: "今日", remote: "遥视", friends: "朋友", premium: "高级", admin: "管理", score: "得分" },
  hi: { today: "आज", remote: "दूरदृष्टि", friends: "मित्र", premium: "प्रीमियम", admin: "प्रबंध", score: "अंक" },
  es: { today: "Hoy", remote: "Visión", friends: "Amigos", premium: "Premium", admin: "Admin", score: "Puntos" },
  fr: { today: "Aujourd’hui", remote: "Vision", friends: "Amis", premium: "Premium", admin: "Admin", score: "Score" },
  ar: { today: "اليوم", remote: "الرؤية", friends: "الأصدقاء", premium: "مميز", admin: "الإدارة", score: "النتيجة" },
  bn: { today: "আজ", remote: "দূরদৃষ্টি", friends: "বন্ধুরা", premium: "প্রিমিয়াম", admin: "অ্যাডমিন", score: "স্কোর" },
  pt: { today: "Hoje", remote: "Visão", friends: "Amigos", premium: "Premium", admin: "Admin", score: "Pontos" },
  ru: { today: "Сегодня", remote: "Видение", friends: "Друзья", premium: "Премиум", admin: "Админ", score: "Счёт" },
  ur: { today: "آج", remote: "دور بینی", friends: "دوست", premium: "پریمیم", admin: "انتظام", score: "اسکور" }
};

const adminEmailAllowlist = new Set(["admin@intuisity.com", "kathy@intuisity.com"]);

const seoKeywords = [
  "Awareness",
  "Insight",
  "Consciousness",
  "Mindfulness",
  "Sixth Sense",
  "Synchronicity",
  "Inner Wisdom",
  "Inner Knowing",
  "Personal Growth",
  "Spiritual Awakening",
  "Self-Discovery",
  "Remote Viewing",
  "Manifestation",
  "Intuition Training"
];

const seoDescription =
  "Intuisity is a daily training platform designed to help you develop intuition, awareness, insight, consciousness, mindfulness, synchronicity recognition, and your natural sixth sense through fun, engaging challenges and real-world experiences. Every day you'll complete five guided activities that help strengthen your inner knowing, improve decision-making, sharpen pattern recognition, and increase your awareness of the opportunities and signals that surround you. Whether you're interested in personal growth, spiritual awakening, consciousness expansion, mindfulness, intuition development, remote viewing, manifestation, or self-discovery, Intuisity provides a structured and measurable path to explore your potential.";

function isAdminUser(profile: UserProfile | null) {
  const extendedProfile = profile as (UserProfile & { isAdmin?: boolean; role?: string }) | null;
  const email = profile?.email?.trim().toLowerCase() || "";
  const role = extendedProfile?.role?.trim().toLowerCase();

  return Boolean(
    extendedProfile?.isAdmin ||
    role === "admin" ||
    adminEmailAllowlist.has(email)
  );
}

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(loadActiveProfile);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [homeRequestId, setHomeRequestId] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => {
    const activeProfile = loadActiveProfile();
    return activeProfile ? loadDailyAnswers(activeProfile.email) : {};
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState("Free");
  const userIsAdmin = isAdminUser(userProfile);
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.key !== "admin" || userIsAdmin),
    [userIsAdmin]
  );

  useEffect(() => {
    updateWebMetadata();
  }, []);

  useEffect(() => {
    if (activeTab === "admin" && !userIsAdmin) {
      setActiveTab("today");
    }
  }, [activeTab, userIsAdmin]);

  const dailyScore = useMemo(() => {
    const baseScore = scoreDailyChallenge(dailyChallenges, answers);
    const personCorrect = Number(answers["person-score"] || 0);
    const personCompleted = Boolean(answers["person-score"]);
    const friendCorrect = Number(answers["friend-score"] || 0);
    const friendCompleted = Object.prototype.hasOwnProperty.call(answers, "friend-score");

    if (!personCompleted && !friendCompleted) return baseScore;

    const correct = baseScore.correct + personCorrect + friendCorrect;
    const total = baseScore.total + (personCompleted ? 5 : 0) + (friendCompleted ? 1 : 0);
    return {
      correct,
      total,
      percent: Math.round((correct / total) * 100),
      points: baseScore.points + personCorrect * 20 + friendCorrect * 20
    };
  }, [answers]);

  const startCheckout = async () => {
    const session = await createStripeCheckoutSession(premiumPlan.id);
    setSubscriptionStatus("Premium pending");
    Alert.alert("Stripe checkout ready", `Connect your backend to open:\n${session.checkoutUrl}`);
  };

  useEffect(() => {
    if (!userProfile) return;
    return scheduleDailyReminder(userProfile.reminderTime);
  }, [userProfile?.reminderTime]);

  useEffect(() => {
    setAnswers(userProfile ? loadDailyAnswers(userProfile.email) : {});
  }, [userProfile?.email]);

  useEffect(() => {
    if (!userProfile) return;
    saveDailyAnswers(userProfile.email, answers);
  }, [answers, userProfile?.email]);

  if (!userProfile) {
    return <AccountAccess onAuthenticated={setUserProfile} />;
  }

  const logout = () => {
    globalThis.localStorage?.removeItem(activeProfileKey);
    setAnswers({});
    setUserProfile(null);
  };

  const confirmLogout = () => {
    const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
    if (browserWindow?.confirm) {
      if (browserWindow.confirm("Do you want to logout?")) logout();
      return;
    }
    Alert.alert("Do you want to logout?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout }
    ]);
  };

  const returnHome = () => {
    setActiveTab("today");
    setHomeRequestId((current) => current + 1);
    setShowLanguageMenu(false);
  };

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.floatingScore}>
        <Pressable
          accessibilityLabel="Go to home page"
          onPress={returnHome}
          style={styles.profileBadge}
        >
          <Ionicons color="#6544B8" name="home-outline" size={22} />
          <Text style={styles.profileBadgeText}>Home</Text>
        </Pressable>
        <View style={styles.topRightActions}>
          <Pressable
            accessibilityLabel="Change language"
            onPress={() => setShowLanguageMenu((current) => !current)}
            style={styles.languageButton}
          >
            <Ionicons color="#6544B8" name="language-outline" size={21} />
            <Text style={styles.languageButtonText}>{userProfile.language.toUpperCase()}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Log out"
            onPress={confirmLogout}
            style={styles.logoutIconButton}
          >
            <Ionicons color="#6544B8" name="log-out-outline" size={22} />
            <Text style={styles.logoutIconText}>Logout</Text>
          </Pressable>
        </View>
      </View>
      {showLanguageMenu && (
        <View style={styles.languageMenu}>
          {supportedLanguages.map((language) => (
            <Pressable
              key={language.code}
              onPress={() => {
                const updatedProfile = { ...userProfile, language: language.code };
                saveProfile(updatedProfile);
                setUserProfile(updatedProfile);
                setShowLanguageMenu(false);
              }}
              style={[styles.languageMenuOption, userProfile.language === language.code && styles.languageMenuOptionSelected]}
            >
              <Text style={[styles.languageMenuNative, userProfile.language === language.code && styles.languageMenuTextSelected]}>{language.nativeName}</Text>
              <Text style={[styles.languageMenuEnglish, userProfile.language === language.code && styles.languageMenuTextSelected]}>{language.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === "today" && (
          <DailyChallengeHub
            answers={answers}
            homeRequestId={homeRequestId}
            isPremium={subscriptionStatus !== "Free"}
            onLogout={confirmLogout}
            onUpdateProfile={(updatedProfile) => {
              saveProfile(updatedProfile);
              setUserProfile(updatedProfile);
            }}
            setAnswers={setAnswers}
            userProfile={userProfile}
          />
        )}
        {activeTab === "friends" && <FriendChallenges />}
        {activeTab === "premium" && (
          <Premium status={subscriptionStatus} startCheckout={startCheckout} />
        )}
        {activeTab === "admin" && userIsAdmin && <AdminDashboard />}
      </ScrollView>

      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <Pressable
              accessibilityRole="button"
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, selected && styles.tabButtonSelected]}
            >
              <Ionicons
                color={selected ? "#6544B8" : "#756D87"}
                name={tab.icon}
                size={20}
              />
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
                {tabTranslations[userProfile.language]?.[tab.key] || tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function AccountAccess({ onAuthenticated }: { onAuthenticated: (profile: UserProfile) => void }) {
  const savedProfiles = loadProfiles();
  const emptyProfile: UserProfile = {
    language: "en", email: "", phone: "", name: "", reminderTime: "9:00 AM", timeZone: detectTimeZone(), birthdate: "", birthTime: "", birthCity: "", birthState: "",
    birthCountry: "", currentCity: "", currentState: "", currentCountry: detectLocaleCountry()
  };
  const [mode, setMode] = useState<"welcome" | "login" | "create" | "reset">("welcome");
  const [profile, setProfile] = useState(emptyProfile);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");

  const authenticate = (nextProfile: UserProfile) => {
    saveProfile(nextProfile);
    onAuthenticated(nextProfile);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoginNotice("");
    try {
      const googleProfile = await signInWithGoogle();
      const normalizedEmail = googleProfile.email.trim().toLowerCase();
      const savedProfile = loadProfiles().find((item) => item.email.toLowerCase() === normalizedEmail);
      const nextProfile: UserProfile = {
        ...emptyProfile,
        ...savedProfile,
        authProvider: "google",
        email: normalizedEmail,
        name: savedProfile?.name || googleProfile.name || normalizedEmail,
        timeZone: savedProfile?.timeZone || detectTimeZone(),
        currentCountry: savedProfile?.currentCountry || detectLocaleCountry(),
        reminderTime: savedProfile?.reminderTime || "9:00 AM"
      };
      authenticate(nextProfile);
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : "Google sign-in could not start.");
    }
  };

  if (mode === "welcome") {
    return (
      <SafeAreaView style={styles.accountScreen}>
        <View style={styles.accountHero}>
          <Ionicons color="#FFFFFF" name="sparkles-outline" size={34} />
          <Text style={styles.accountHeroTitle}>Welcome to Intuisity</Text>
          <Text style={styles.accountHeroText}>Awaken your intuition. Expand your awareness. Unlock your inner wisdom.</Text>
          <View style={styles.freePlayBadge}>
            <Ionicons color="#008A94" name="gift-outline" size={17} />
            <Text style={styles.freePlayBadgeText}>Free to play daily challenges</Text>
          </View>
        </View>
        <Pressable onPress={() => setMode("create")} style={styles.primaryButton}>
          <Ionicons color="#FFFFFF" name="person-add-outline" size={18} />
          <Text style={styles.primaryButtonText}>Create my account</Text>
        </Pressable>
        <GoogleSignInButton onPress={handleGoogleSignIn} />
        <Pressable
          onPress={() => {
            if (savedProfiles.length > 0) {
              setProfile({ ...emptyProfile, email: savedProfiles[0].email });
            }
            setMode("login");
          }}
          style={styles.accountSecondaryButton}
        >
          <Text style={styles.accountSecondaryText}>I already have an account</Text>
        </Pressable>
        {error ? <Text style={styles.accountError}>{error}</Text> : null}
        <LegalLinks />
      </SafeAreaView>
    );
  }

  if (mode === "login") {
    return (
      <SafeAreaView style={styles.accountScreen}>
        <Text style={styles.accountTitle}>Welcome back</Text>
        <Text style={styles.accountSubtitle}>Enter your email and password to return to your saved Intuisity profile.</Text>
        <View style={styles.loginFreePlayNote}>
          <Ionicons color="#008A94" name="sparkles-outline" size={17} />
          <Text style={styles.loginFreePlayText}>Free to play. Premium extras are optional.</Text>
        </View>
        <GoogleSignInButton onPress={handleGoogleSignIn} />
        <View style={styles.loginDivider}>
          <View style={styles.loginDividerLine} />
          <Text style={styles.loginDividerText}>or use email</Text>
          <View style={styles.loginDividerLine} />
        </View>
        <ProfileInput autoComplete="email" label="Email address" textContentType="emailAddress" value={profile.email} onChangeText={(email) => setProfile({ ...profile, email })} />
        <ProfileInput autoComplete="current-password" label="Password" secure textContentType="password" value={password} onChangeText={setPassword} />
        <Pressable
          onPress={() => {
            setPassword("");
            setConfirmPassword("");
            setError("");
            setLoginNotice("");
            setMode("reset");
          }}
          style={styles.forgotPasswordButton}
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </Pressable>
        {savedProfiles.length > 0 && (
          <View style={styles.savedAccountList}>
            <Text style={styles.savedAccountLabel}>Saved accounts</Text>
            {savedProfiles.map((savedProfile) => (
              <Pressable
                accessibilityLabel={`Use saved account ${savedProfile.email}`}
                key={savedProfile.email}
                onPress={() => {
                  if (savedProfile.authProvider === "google" && !savedProfile.passwordHash) {
                    authenticate(savedProfile);
                    return;
                  }
                  setProfile({ ...emptyProfile, email: savedProfile.email });
                  setPassword("");
                  setError("");
                  setLoginNotice("Saved account selected. Enter your password above, then click Log in.");
                }}
                style={[
                  styles.savedAccountButton,
                  profile.email.toLowerCase() === savedProfile.email.toLowerCase() && styles.savedAccountButtonSelected
                ]}
              >
                <Ionicons
                  color={profile.email.toLowerCase() === savedProfile.email.toLowerCase() ? "#FFFFFF" : "#7555C7"}
                  name="person-circle-outline"
                  size={20}
                />
                <View style={styles.savedAccountCopy}>
                  <Text style={[styles.savedAccountName, profile.email.toLowerCase() === savedProfile.email.toLowerCase() && styles.savedAccountTextSelected]}>{savedProfile.name}</Text>
                  <Text style={[styles.savedAccountEmail, profile.email.toLowerCase() === savedProfile.email.toLowerCase() && styles.savedAccountTextSelected]}>
                    {savedProfile.email}
                  </Text>
                  <Text style={[styles.savedAccountAction, profile.email.toLowerCase() === savedProfile.email.toLowerCase() && styles.savedAccountTextSelected]}>
                    {savedProfile.authProvider === "google" && !savedProfile.passwordHash ? "Tap to continue" : "Tap to fill email, then enter password"}
                  </Text>
                </View>
                {profile.email.toLowerCase() === savedProfile.email.toLowerCase() && (
                  <Ionicons color="#FFFFFF" name="checkmark-circle" size={19} />
                )}
              </Pressable>
            ))}
          </View>
        )}
        {loginNotice ? <Text style={styles.accountHint}>{loginNotice}</Text> : null}
        {error ? <Text style={styles.accountError}>{error}</Text> : null}
        <Pressable
          onPress={() => {
            setLoginNotice("");
            const saved = loadProfiles().find((item) => item.email.toLowerCase() === profile.email.trim().toLowerCase());
            if (!saved) {
              setError("We could not find a saved profile with that email.");
              return;
            }
            if (password.trim().length < 8) {
              setError("Please enter your password.");
              return;
            }
            const passwordHash = createPasswordHash(saved.email, password);
            if (saved.passwordHash && saved.passwordHash !== passwordHash) {
              setError("That password does not match this account.");
              return;
            }
            const profileToUse: UserProfile = saved.passwordHash
              ? { ...saved, authProvider: saved.authProvider || "password" }
              : { ...saved, authProvider: "password", passwordHash };
            if (!saved.passwordHash) {
              saveProfile(profileToUse);
            }
            globalThis.localStorage?.setItem(activeProfileKey, saved.email);
            onAuthenticated(profileToUse);
          }}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Log in</Text>
        </Pressable>
        <Pressable onPress={() => setMode("welcome")} style={styles.accountSecondaryButton}>
          <Text style={styles.accountSecondaryText}>Back</Text>
        </Pressable>
        <LegalLinks />
      </SafeAreaView>
    );
  }

  if (mode === "reset") {
    const passwordRules = getPasswordRules(password);
    const newPasswordReady = passwordRules.every((rule) => rule.passed) && password === confirmPassword;
    const resetReady = profile.email.trim() && profile.phone.replace(/\D/g, "").length >= 10 && newPasswordReady;

    return (
      <SafeAreaView style={styles.accountScreen}>
        <Text style={styles.accountTitle}>Reset password</Text>
        <Text style={styles.accountSubtitle}>Enter the email and phone number from your profile, then choose a new password.</Text>
        <ProfileInput autoComplete="email" label="Email address" textContentType="emailAddress" value={profile.email} onChangeText={(email) => setProfile({ ...profile, email })} />
        <ProfileInput autoComplete="tel" label="Phone number" placeholder="(555) 555-5555" textContentType="telephoneNumber" value={profile.phone} onChangeText={(phone) => setProfile({ ...profile, phone: formatPhoneNumber(phone) })} />
        <ProfileInput autoComplete="new-password" label="New password" secure textContentType="newPassword" value={password} onChangeText={setPassword} />
        <PasswordRequirementList password={password} />
        <ProfileInput autoComplete="new-password" label="Confirm new password" secure textContentType="newPassword" value={confirmPassword} onChangeText={setConfirmPassword} />
        {confirmPassword.length > 0 && password !== confirmPassword ? <Text style={styles.accountError}>Passwords do not match yet.</Text> : null}
        {error ? <Text style={styles.accountError}>{error}</Text> : null}
        <Pressable
          disabled={!resetReady}
          onPress={() => {
            const saved = loadProfiles().find((item) => item.email.toLowerCase() === profile.email.trim().toLowerCase());
            if (!saved) {
              setError("We could not find a saved profile with that email.");
              return;
            }
            if (saved.phone.replace(/\D/g, "") !== profile.phone.replace(/\D/g, "")) {
              setError("That phone number does not match this saved profile.");
              return;
            }
            const updatedProfile = {
              ...saved,
              authProvider: "password" as const,
              passwordHash: createPasswordHash(saved.email, password)
            };
            saveProfile(updatedProfile);
            setPassword("");
            setConfirmPassword("");
            setError("");
            onAuthenticated(updatedProfile);
          }}
          style={[styles.primaryButton, !resetReady && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>Reset password and log in</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setPassword("");
            setConfirmPassword("");
            setError("");
            setMode("login");
          }}
          style={styles.accountSecondaryButton}
        >
          <Text style={styles.accountSecondaryText}>Back to login</Text>
        </Pressable>
        <LegalLinks />
      </SafeAreaView>
    );
  }

  const passwordRules = getPasswordRules(password);
  const passwordReady = passwordRules.every((rule) => rule.passed) && password === confirmPassword;
  const requiredComplete = profile.name.trim() && profile.email.trim() && profile.phone.replace(/\D/g, "").length >= 10 && passwordReady;
  const detectedTimeZone = detectTimeZone();

  return (
    <SafeAreaView style={styles.accountFormScreen}>
      <ScrollView contentContainerStyle={styles.accountFormContent} keyboardShouldPersistTaps="handled">
        <Image
          accessibilityLabel="Intuisity banner showing the awakening intuition theme"
          resizeMode="cover"
          source={require("./assets/intuisity-front-banner-v5.png")}
          style={styles.signupBanner}
        />
        <Text style={styles.accountTitle}>Create your Intuisity profile</Text>
        <Text style={styles.accountSubtitle}>Use Google for the fastest setup, or create an email and password account below.</Text>
        <GoogleSignInButton onPress={handleGoogleSignIn} />
        <View style={styles.loginDivider}>
          <View style={styles.loginDividerLine} />
          <Text style={styles.loginDividerText}>or create with email</Text>
          <View style={styles.loginDividerLine} />
        </View>
        <ProfileInput autoComplete="name" label="Your name" textContentType="name" value={profile.name} onChangeText={(name) => setProfile({ ...profile, name })} />
        <ProfileInput autoComplete="email" label="Email address" textContentType="emailAddress" value={profile.email} onChangeText={(email) => setProfile({ ...profile, email })} />
        <ProfileInput autoComplete="new-password" label="Create password" secure textContentType="newPassword" value={password} onChangeText={setPassword} />
        <PasswordRequirementList password={password} />
        <ProfileInput autoComplete="new-password" label="Confirm password" secure textContentType="newPassword" value={confirmPassword} onChangeText={setConfirmPassword} />
        {confirmPassword.length > 0 && password !== confirmPassword ? <Text style={styles.accountError}>Passwords do not match yet.</Text> : null}
        <ProfileInput autoComplete="tel" label="Phone number" placeholder="(555) 555-5555" textContentType="telephoneNumber" value={profile.phone} onChangeText={(phone) => setProfile({ ...profile, phone: formatPhoneNumber(phone) })} />
        <View style={styles.reminderNotice}>
          <Ionicons color="#7555C7" name="alarm-outline" size={22} />
          <View style={styles.reminderNoticeCopy}>
            <Text style={styles.reminderNoticeTitle}>Daily intuition reminder</Text>
            <Text style={styles.reminderNoticeText}>We will use your device time zone for the 9:00 AM reminder.</Text>
            <Text style={styles.reminderNoticeTimeZone}>Detected time zone: {detectedTimeZone}</Text>
          </View>
        </View>
        {error ? <Text style={styles.accountError}>{error}</Text> : null}
        <Pressable
          disabled={!requiredComplete}
          onPress={() => {
            const normalizedEmail = profile.email.trim().toLowerCase();
            if (loadProfiles().some((item) => item.email.toLowerCase() === normalizedEmail)) {
              setError("An account with this email already exists. Please log in instead.");
              return;
            }
            authenticate({
              ...profile,
              email: normalizedEmail,
              name: profile.name.trim(),
              phone: formatPhoneNumber(profile.phone),
              passwordHash: createPasswordHash(normalizedEmail, password),
              authProvider: "password",
              reminderTime: "9:00 AM",
              timeZone: detectedTimeZone,
              currentCountry: profile.currentCountry || detectLocaleCountry()
            });
          }}
          style={[styles.primaryButton, !requiredComplete && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>Save profile and begin</Text>
        </Pressable>
        <Pressable onPress={() => setMode("welcome")} style={styles.accountSecondaryButton}>
          <Text style={styles.accountSecondaryText}>Back</Text>
        </Pressable>
        <LegalLinks />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegalLinks() {
  return (
    <View style={styles.legalLinks}>
      <Pressable onPress={() => openLegalPage("privacy.html")} style={styles.legalLinkButton}>
        <Text style={styles.legalLinkText}>Privacy Policy</Text>
      </Pressable>
      <Text style={styles.legalLinkDivider}>|</Text>
      <Pressable onPress={() => openLegalPage("terms.html")} style={styles.legalLinkButton}>
        <Text style={styles.legalLinkText}>Terms of Service</Text>
      </Pressable>
    </View>
  );
}

function openLegalPage(page: "privacy.html" | "terms.html") {
  Linking.openURL(`https://www.intuisity.com/${page}`);
}

function LanguageSelector({ selected, onSelect }: { selected: string; onSelect: (language: string) => void }) {
  const [showOptions, setShowOptions] = useState(false);
  const selectedLanguage = supportedLanguages.find((language) => language.code === selected) || supportedLanguages[0];

  return (
    <View style={styles.languageSetup}>
      <View style={styles.languageSetupHeader}>
        <View>
          <Text style={styles.accountGroupLabel}>Language</Text>
          <Text style={styles.languageSetupDefault}>English is selected unless you change it.</Text>
        </View>
        <Pressable
          accessibilityLabel="Change language"
          onPress={() => setShowOptions((current) => !current)}
          style={styles.languageButton}
        >
          <Ionicons color="#6544B8" name="language-outline" size={21} />
          <Text style={styles.languageButtonText}>{selectedLanguage.code.toUpperCase()}</Text>
        </Pressable>
      </View>
      {showOptions && (
        <View style={styles.signupLanguageMenu}>
        {supportedLanguages.map((language) => (
          <Pressable
            accessibilityLabel={`Choose ${language.name}`}
            key={language.code}
            onPress={() => {
              onSelect(language.code);
              setShowOptions(false);
            }}
            style={[styles.languageMenuOption, selectedLanguage.code === language.code && styles.languageMenuOptionSelected]}
          >
            <Text style={[styles.languageMenuNative, selectedLanguage.code === language.code && styles.languageMenuTextSelected]}>{language.nativeName}</Text>
            <Text style={[styles.languageMenuEnglish, selectedLanguage.code === language.code && styles.languageMenuTextSelected]}>{language.name}</Text>
          </Pressable>
        ))}
        </View>
      )}
    </View>
  );
}

function ProfileInput({ autoComplete, label, value, onChangeText, placeholder = "", suggestions = [], secure = false, textContentType }: { autoComplete?: TextInputProps["autoComplete"]; label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; suggestions?: string[]; secure?: boolean; textContentType?: TextInputProps["textContentType"] }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const matchingSuggestions = value.trim().length
    ? suggestions.filter((suggestion) => suggestion.toLowerCase().startsWith(value.trim().toLowerCase())).slice(0, 5)
    : [];
  const showSuggestions = matchingSuggestions.length > 0 && !matchingSuggestions.some(
    (suggestion) => suggestion.toLowerCase() === value.trim().toLowerCase()
  );

  return (
    <View style={styles.accountField}>
      <Text style={styles.accountFieldLabel}>{label}</Text>
      <View style={styles.accountInputWrap}>
        <TextInput accessibilityLabel={label} autoCapitalize={label.includes("Email") || secure ? "none" : "words"} autoComplete={autoComplete} keyboardType={label.includes("Email") ? "email-address" : label.includes("Phone") ? "phone-pad" : label === "Birthdate" ? "number-pad" : "default"} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9A93AA" secureTextEntry={secure && !passwordVisible} style={[styles.accountInput, secure && styles.accountPasswordInput]} textContentType={textContentType} value={value} />
        {secure ? (
          <Pressable
            accessibilityLabel={passwordVisible ? `Hide ${label}` : `Show ${label}`}
            onPress={() => setPasswordVisible((current) => !current)}
            style={styles.passwordVisibilityButton}
          >
            <Ionicons color="#6544B8" name={passwordVisible ? "eye-off-outline" : "eye-outline"} size={21} />
          </Pressable>
        ) : null}
      </View>
      {showSuggestions && (
        <View style={styles.stateSuggestions}>
          {matchingSuggestions.map((suggestion) => (
            <Pressable
              accessibilityLabel={`Choose ${suggestion}`}
              key={suggestion}
              onPress={() => onChangeText(suggestion)}
              style={styles.stateSuggestion}
            >
              <Ionicons color="#7555C7" name="location-outline" size={16} />
              <Text style={styles.stateSuggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function GoogleSignInButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.googleButton}>
      <View style={styles.googleIconCircle}>
        <Text style={styles.googleIconText}>G</Text>
      </View>
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </Pressable>
  );
}

function PasswordRequirementList({ password }: { password: string }) {
  const rules = getPasswordRules(password);

  return (
    <View style={styles.passwordRules}>
      <Text style={styles.passwordRulesTitle}>Your password must contain:</Text>
      {rules.map((rule) => (
        <View key={rule.label} style={styles.passwordRuleRow}>
          <Ionicons
            color={rule.passed ? "#008A94" : "#9A93AA"}
            name={rule.passed ? "checkmark-circle" : "ellipse-outline"}
            size={16}
          />
          <Text style={[styles.passwordRuleText, rule.passed && styles.passwordRuleTextPassed]}>
            {rule.label}: {rule.passed ? "Pass" : "Needed"}
          </Text>
        </View>
      ))}
    </View>
  );
}

type GoogleProfile = {
  email: string;
  name: string;
};

async function getGoogleClientId() {
  const browserWindow = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  const bundledClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    browserWindow?.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    browserWindow?.GOOGLE_CLIENT_ID ||
    "";

  if (bundledClientId) return bundledClientId;

  try {
    const response = await fetch(`/api/public-config?checkedAt=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return "";
    const config = await response.json();
    return String(config?.googleClientId || "").trim();
  } catch {
    return "";
  }
}

function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    const documentRef = (globalThis as any).document;
    if (!documentRef) {
      reject(new Error("Google sign-in works on the hosted web app."));
      return;
    }

    if ((globalThis as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = documentRef.querySelector("script[data-intuisity-google-signin='true']");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google sign-in could not load.")), { once: true });
      return;
    }

    const script = documentRef.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = "https://accounts.google.com/gsi/client";
    script.setAttribute("data-intuisity-google-signin", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in could not load."));
    documentRef.head.appendChild(script);
  });
}

async function signInWithGoogle(): Promise<GoogleProfile> {
  const clientId = await getGoogleClientId();
  if (!clientId) {
    throw new Error("Google sign-in needs EXPO_PUBLIC_GOOGLE_CLIENT_ID set for this deployment.");
  }

  await loadGoogleIdentityScript();
  const google = (globalThis as any).google;
  const origin = (globalThis as any)?.window?.location?.origin || "this site";

  if (!google?.accounts?.oauth2?.initTokenClient) {
    throw new Error("Google sign-in library did not initialize. Refresh and try again.");
  }

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      callback: async (tokenResponse: { access_token?: string; error?: string }) => {
        if (tokenResponse.error) {
          reject(new Error(`Google sign-in failed: ${tokenResponse.error}. Make sure ${origin} is in Google Authorized JavaScript origins.`));
          return;
        }

        if (!tokenResponse.access_token) {
          reject(new Error("Google sign-in returned no access token. Please try again."));
          return;
        }

        try {
          const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          });
          if (!response.ok) throw new Error("Google profile could not be loaded.");
          const googleProfile = await response.json();
          if (!googleProfile?.email) throw new Error("Google did not return an email address.");
          resolve({
            email: String(googleProfile.email),
            name: String(googleProfile.name || googleProfile.email)
          });
        } catch (error) {
          reject(error);
        }
      },
      prompt: "select_account",
      scope: "openid email profile"
    });

    tokenClient.requestAccessToken();
  });
}

function loadProfiles(): UserProfile[] {
  try {
    const stored = globalThis.localStorage?.getItem(profilesKey);
    return stored ? JSON.parse(stored).map((profile: UserProfile) => ({
      ...profile,
      currentCountry: profile.currentCountry || detectLocaleCountry(),
      language: profile.language || "en",
      reminderTime: profile.reminderTime || "9:00 AM",
      timeZone: profile.timeZone || detectTimeZone()
    })) : [];
  } catch {
    return [];
  }
}

function loadActiveProfile(): UserProfile | null {
  try {
    const activeEmail = globalThis.localStorage?.getItem(activeProfileKey);
    return loadProfiles().find((profile) => profile.email === activeEmail) || null;
  } catch {
    return null;
  }
}

function saveProfile(profile: UserProfile) {
  const profiles = loadProfiles().filter((item) => item.email !== profile.email);
  globalThis.localStorage?.setItem(profilesKey, JSON.stringify([...profiles, profile]));
  globalThis.localStorage?.setItem(activeProfileKey, profile.email);
  syncProfile(profile);
}

function createPasswordHash(email: string, password: string) {
  const value = `${email.trim().toLowerCase()}|${password}`;
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return `local-${(hash >>> 0).toString(36)}`;
}

function getPasswordRules(password: string) {
  const categoryCount = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;

  return [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "At least 3 of the following", passed: categoryCount >= 3 },
    { label: "Lower case letters (a-z)", passed: /[a-z]/.test(password) },
    { label: "Upper case letters (A-Z)", passed: /[A-Z]/.test(password) },
    { label: "Numbers (0-9)", passed: /\d/.test(password) },
    { label: "Special characters (e.g. !@#$%^&*)", passed: /[^A-Za-z0-9]/.test(password) },
    { label: "No more than 2 identical characters in a row", passed: !/(.)\1\1/.test(password) }
  ];
}

function detectTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  } catch {
    return "Local time";
  }
}

function detectLocaleCountry() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || "";
    const countryMatch = locale.match(/[-_]([A-Z]{2})\b/);
    return countryMatch?.[1] || "";
  } catch {
    return "";
  }
}

function getDailyAnswersKey(email: string) {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
  return `${dailyAnswersKeyPrefix}-${email.toLowerCase()}-${today}`;
}

function loadDailyAnswers(email: string): Answers {
  try {
    const stored = globalThis.localStorage?.getItem(getDailyAnswersKey(email));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDailyAnswers(email: string, answers: Answers) {
  try {
    globalThis.localStorage?.setItem(getDailyAnswersKey(email), JSON.stringify(answers));
    syncDailyAnswers(email, answers);
  } catch {
    // Browser storage may be unavailable in private mode.
  }
}

function formatProfileBirthdate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

function formatProfileBirthTime(value: string) {
  const periodMatch = value.toUpperCase().match(/(AM|PM|A|P)\s*$/);
  let period = periodMatch ? (periodMatch[1].startsWith("A") ? "AM" : "PM") : "";
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (!digits) return period;
  if (digits.length <= 2) return digits;
  const hourLength = digits.length === 3 ? 1 : 2;
  const hour = Number(digits.slice(0, hourLength));
  if (!period && hourLength === 2 && digits.startsWith("0")) {
    period = "AM";
  }
  const formattedTime = `${hour}:${digits.slice(hourLength)}`;
  return period ? `${formattedTime}${period.toLowerCase()}` : formattedTime;
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseReminderTime(value: string) {
  const cleaned = value.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return { hour: 9, minute: 0 };
  let hour = Number(match[1]);
  const minute = Math.min(Number(match[2] || "0"), 59);
  const period = match[3];

  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else if (period === "PM") {
    if (hour < 12) hour += 12;
  }

  if (hour < 0 || hour > 23) return { hour: 9, minute: 0 };
  return { hour, minute };
}

function scheduleDailyReminder(reminderTime = "9:00 AM") {
  const now = new Date();
  const nextReminder = new Date(now);
  const { hour, minute } = parseReminderTime(reminderTime);
  nextReminder.setHours(hour, minute, 0, 0);
  if (nextReminder.getTime() <= now.getTime()) {
    nextReminder.setUTCDate(nextReminder.getUTCDate() + 1);
  }

  let dailyInterval: ReturnType<typeof setInterval> | undefined;
  const showReminder = () => {
    Alert.alert("Your daily Intuisity practice is ready", "Take a quiet moment and see what your intuition reveals today.");
  };
  const timeout = setTimeout(() => {
    showReminder();
    dailyInterval = setInterval(showReminder, 24 * 60 * 60 * 1000);
  }, nextReminder.getTime() - now.getTime());

  return () => {
    clearTimeout(timeout);
    if (dailyInterval) clearInterval(dailyInterval);
  };
}

function validBirthdate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[1]) - 1 && date.getDate() === Number(match[2]);
}

function DailyChallenge({
  answers,
  dailyScore,
  setAnswers
}: {
  answers: Answers;
  dailyScore: any;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  const [showResults, setShowResults] = useState(false);
  const [rewardImage, setRewardImage] = useState<any>(null);
  const answeredCount = Object.keys(answers).length;

  if (showResults) {
    return (
      <View>
        <SectionHeader
          eyebrow="Today's results"
          title="Your intuition score"
          subtitle="Every session helps you notice your strongest intuitive signals."
        />
        <View style={styles.resultsPanel}>
          <Ionicons color="#7555C7" name="sparkles-outline" size={42} />
          <Text style={styles.resultsNumber}>
            {dailyScore.correct} of {dailyScore.total}
          </Text>
          <Text style={styles.resultsLabel}>challenges correct</Text>
          <Text style={styles.resultsPoints}>{dailyScore.points} points earned</Text>
        </View>
        <View style={styles.summaryRow}>
          <Metric label="Accuracy" value={`${dailyScore.percent}%`} />
          <Metric label="Completed" value={dailyScore.total} />
        </View>
        <Text style={styles.reviewHeading}>Challenge review</Text>
        {dailyChallenges.map((challenge, index) => {
          const selectedAnswer = answers[challenge.id];
          const isCorrect = selectedAnswer === challenge.answer;

          return (
            <View
              key={challenge.id}
              style={[
                styles.reviewCard,
                isCorrect ? styles.reviewCardCorrect : styles.reviewCardIncorrect
              ]}
            >
              <View style={styles.reviewTopRow}>
                <View style={[styles.reviewIcon, isCorrect && styles.reviewIconCorrect]}>
                  <Ionicons
                    color={isCorrect ? "#FFFFFF" : "#B15A60"}
                    name={isCorrect ? "checkmark" : "close"}
                    size={20}
                  />
                </View>
                <View style={styles.reviewCopy}>
                  <Text style={styles.cardCount}>Challenge {index + 1}</Text>
                  <Text style={styles.reviewTitle}>{challenge.title}</Text>
                </View>
              </View>
              <Text style={styles.reviewAnswer}>
                Your answer: <Text style={styles.reviewAnswerStrong}>{selectedAnswer}</Text>
              </Text>
              {!isCorrect && (
                <Text style={styles.correctAnswer}>
                  Correct answer: {challenge.answer}
                </Text>
              )}
            </View>
          );
        })}
        <Pressable onPress={() => setShowResults(false)} style={styles.primaryButton}>
          <Ionicons color="#FFFFFF" name="arrow-back-outline" size={18} />
          <Text style={styles.primaryButtonText}>Review challenges</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader
        eyebrow="Today's practice"
        title="Five ways to strengthen your intuition"
        subtitle="Follow the signal that draws you in, make your choice, and build your score."
      />
      <View style={styles.hero}>
        <Image
          accessibilityLabel="A glowing celestial portal representing intuition"
          resizeMode="cover"
          source={require("./assets/intuition-hero.png")}
          style={styles.heroImage}
        />
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>Begin your journey</Text>
          <Text style={styles.heroTitle}>What is your intuition telling you today?</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {answeredCount} of {dailyChallenges.length} answered
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(answeredCount / dailyChallenges.length) * 100}%` }
            ]}
          />
        </View>
      </View>

      {dailyChallenges.map((challenge, index) => (
        <View key={challenge.id} style={styles.card}>
          <Text style={styles.cardCount}>Practice {index + 1}</Text>
          <Text style={styles.cardTitle}>{challenge.title}</Text>
          <Text style={styles.challengeTagline}>{challenge.tagline}</Text>
          <Text style={styles.cardTitle}>{challenge.prompt}</Text>
          <View
            style={[
              styles.choiceGrid,
              challenge.id === "daily-intuition" && styles.colorChoiceGrid
            ]}
          >
            {challenge.choices.map((choice) => {
              const selected = answers[challenge.id] === choice;
              const isColorChoice = challenge.id === "daily-intuition";
              return (
                <Pressable
                  key={choice}
                  accessibilityLabel={`${choice} choice`}
                  onPress={() => {
                    setAnswers((current) => ({ ...current, [challenge.id]: choice }));
                    if (isColorChoice && choice === challenge.answer) {
                      const nextImage =
                        rewardImages[Math.floor(Math.random() * rewardImages.length)];
                      setRewardImage(nextImage);
                    } else if (isColorChoice) {
                      setRewardImage(null);
                    }
                  }}
                  style={[
                    styles.choice,
                    isColorChoice && styles.colorChoice,
                    isColorChoice && { backgroundColor: knowingColors[choice] },
                    selected && !isColorChoice && styles.choiceSelected,
                    selected && isColorChoice && styles.colorChoiceSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      isColorChoice && styles.colorChoiceText,
                      selected && !isColorChoice && styles.choiceTextSelected
                    ]}
                  >
                    {choice}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {challenge.id === "daily-intuition" && rewardImage && (
            <View style={styles.rewardReveal}>
              <Image
                accessibilityLabel="Beautiful reward image for choosing the correct color"
                resizeMode="cover"
                source={rewardImage}
                style={styles.rewardImage}
              />
              <View style={styles.rewardMessage}>
                <Ionicons color="#FFFFFF" name="sparkles" size={20} />
                <Text style={styles.rewardMessageText}>You knew it!</Text>
              </View>
            </View>
          )}
        </View>
      ))}
      <Pressable
        disabled={answeredCount !== dailyChallenges.length}
        onPress={() => setShowResults(true)}
        style={[
          styles.primaryButton,
          answeredCount !== dailyChallenges.length && styles.disabledButton
        ]}
      >
        <Ionicons color="#FFFFFF" name="trophy-outline" size={18} />
        <Text style={styles.primaryButtonText}>See my results</Text>
      </Pressable>
    </View>
  );
}

function RemoteViewing({
  remotePick,
  remoteRevealed,
  remoteScore,
  setRemotePick,
  setRemoteRevealed
}: {
  remotePick: any;
  remoteRevealed: boolean;
  remoteScore: any;
  setRemotePick: (pick: any) => void;
  setRemoteRevealed: (revealed: boolean) => void;
}) {
  return (
    <View>
      <SectionHeader
        eyebrow="Remote viewing"
        title="Target session"
        subtitle="Read the cue impressions, pick the closest match, then reveal the target."
      />
      <View style={styles.remotePanel}>
        <Ionicons color="#7555C7" name="radio-outline" size={28} />
        <Text style={styles.remotePrompt}>Target sealed. Choose the signal that feels strongest.</Text>
      </View>
      {remoteViewingOptions.map((option) => {
        const selected = remotePick?.imageId === option.imageId;
        return (
          <Pressable
            key={option.imageId}
            onPress={() => {
              setRemotePick({ ...option, confidence: 4 });
              setRemoteRevealed(false);
            }}
            style={[styles.card, selected && styles.focusCard]}
          >
            <Text style={styles.cardTitle}>{option.label}</Text>
            <Text style={styles.bodyText}>{option.cue}</Text>
          </Pressable>
        );
      })}
      <Pressable
        disabled={!remotePick}
        onPress={() => setRemoteRevealed(true)}
        style={[styles.primaryButton, !remotePick && styles.disabledButton]}
      >
        <Ionicons color="#FFFFFF" name="eye-outline" size={18} />
        <Text style={styles.primaryButtonText}>Reveal target</Text>
      </Pressable>
      {remoteRevealed && (
        <View style={styles.card}>
          <Text style={styles.cardCount}>Result</Text>
          <Text style={styles.cardTitle}>{remoteViewingTarget.title}</Text>
          <Text style={styles.bodyText}>{remoteViewingTarget.reveal}</Text>
          <Text style={styles.resultText}>
            {remoteScore.hit ? "Hit" : "Miss"} · {remoteScore.points} points
          </Text>
        </View>
      )}
    </View>
  );
}

function FriendChallenges() {
  return (
    <View>
      <SectionHeader
        eyebrow="Friend challenges"
        title="Play together"
        subtitle="Invite friends into short prediction games and compare scores."
      />
      <Pressable
        onPress={() => Alert.alert("Invite created", "Friend challenge invitation is ready to send.")}
        style={styles.primaryButton}
      >
        <Ionicons color="#FFFFFF" name="send-outline" size={18} />
        <Text style={styles.primaryButtonText}>Create challenge</Text>
      </Pressable>
      {friendChallenges.length === 0 && (
        <View style={styles.card}>
          <Ionicons color="#7555C7" name="people-outline" size={32} />
          <Text style={styles.cardTitle}>No friend challenges yet</Text>
          <Text style={styles.bodyText}>When you invite friends, their challenges will appear here.</Text>
        </View>
      )}
      {friendChallenges.map((challenge) => (
        <View key={challenge.id} style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{challenge.name}</Text>
            <Text style={styles.statusPill}>{challenge.status}</Text>
          </View>
          <Text style={styles.bodyText}>{challenge.prompt}</Text>
        </View>
      ))}
    </View>
  );
}

function Premium({ status, startCheckout }: { status: string; startCheckout: () => void }) {
  return (
    <View>
      <SectionHeader
        eyebrow="Subscriptions"
        title={premiumPlan.name}
        subtitle="A Stripe-ready premium offer for expanded practice, challenges, and trend tracking."
      />
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.price}>{premiumPlan.price}</Text>
          <Text style={styles.statusPill}>{status}</Text>
        </View>
        {premiumPlan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons color="#4DAA57" name="checkmark-circle-outline" size={20} />
            <Text style={styles.bodyText}>{feature}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={startCheckout} style={styles.primaryButton}>
        <Ionicons color="#FFFFFF" name="lock-open-outline" size={18} />
        <Text style={styles.primaryButtonText}>Start premium</Text>
      </Pressable>
    </View>
  );
}

function AdminDashboard() {
  const [backendReport, setBackendReport] = useState<ReturnType<typeof loadAdminAnalyticsReport> | null>(null);
  const [backendStatus, setBackendStatus] = useState("Checking backend database...");
  const [adminSecret, setAdminSecret] = useState(loadAdminSecret);
  const [adminSecretSavedAt, setAdminSecretSavedAt] = useState(adminSecret ? "Saved on this device" : "");
  const [showAdminSecret, setShowAdminSecret] = useState(false);
  const [adminReportPage, setAdminReportPage] = useState<"overview" | "user-insights">("overview");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [moduleTrendDays, setModuleTrendDays] = useState<1 | 7 | 14 | 30>(7);
  const localReport = loadAdminAnalyticsReport(reportStartDate, reportEndDate);
  const report = backendReport || localReport;
  const recentBackendSaves = loadBackendSyncLog();
  const hasActivity = report.totalUsers > 0 || report.totalVisits > 0 || report.feedbackCount > 0;
  const visitorTrendMax = Math.max(1, ...(report.visitorTrend || []).map((day) => day.uniqueVisitors));
  const visitorTrendRows = (report.visitorTrend || []).slice(-14).reverse();
  const moduleTrendRows = (report.moduleDailyTrend || []).slice(-moduleTrendDays);
  const moduleTrendLabels = Array.from(new Set(moduleTrendRows.flatMap((day) => day.modules.map((module) => module.moduleLabel))));
  const moduleTrendMax = Math.max(1, ...moduleTrendRows.flatMap((day) => day.modules.map((module) => module.activeMs || module.totalMs)));
  const moduleTrendColors = ["#7555C7", "#00AEBB", "#43C987", "#F4B740", "#B15A60", "#6544B8", "#706982"];
  const summaryMetrics = [
    { icon: "people-outline" as const, label: "Saved users", value: report.totalUsers },
    { icon: "pulse-outline" as const, label: "Tracked visits", value: report.totalVisits },
    { icon: "person-circle-outline" as const, label: "Unique visitors", value: report.uniqueVisitors },
    { icon: "flash-outline" as const, label: "Active time", value: formatDuration(report.totalActiveTimeMs || report.totalTimeMs) },
    { icon: "time-outline" as const, label: "Page time", value: formatDuration(report.totalTimeMs) }
  ];
  const downloadUserInsights = () => {
    const opener = (globalThis as unknown as { open?: (url: string, target?: string) => void }).open;
    if (opener) {
      opener(backendUserInsightsCsvUrl(adminSecret, reportStartDate, reportEndDate), "_blank");
    } else {
      Alert.alert("CSV download", `Open this backend link to download the CSV: ${backendUserInsightsCsvUrl(adminSecret, reportStartDate, reportEndDate)}`);
    }
  };
  const saveAdminPasswordForDevice = () => {
    saveAdminSecret(adminSecret);
    setAdminSecretSavedAt(adminSecret.trim() ? "Saved on this device" : "Admin password cleared from this device");
  };
  const renderUserInsightsList = (limit?: number) => (
    report.userInsights?.length ? report.userInsights.slice(0, limit || report.userInsights.length).map((user) => (
      <View key={user.email} style={styles.adminUserCard}>
        <View style={styles.adminModuleTopline}>
          <View style={styles.adminUserIdentity}>
            <Text style={styles.adminModuleLabel}>{user.name || "Unnamed user"}</Text>
            <Text style={styles.adminFeedbackMeta}>{user.email}</Text>
          </View>
          <View style={styles.adminUserPill}>
            <Text style={styles.adminUserPillText}>{user.totalClicks} clicks</Text>
          </View>
        </View>
        <View style={styles.adminUserStatsGrid}>
          <View style={styles.adminUserStat}>
            <Text style={styles.adminUserStatLabel}>Most clicked</Text>
            <Text style={styles.adminUserStatValue}>{user.mostClickedModule}</Text>
            <Text style={styles.adminFeedbackMeta}>{user.mostClickedCount} clicks</Text>
          </View>
          <View style={styles.adminUserStat}>
            <Text style={styles.adminUserStatLabel}>Most active</Text>
            <Text style={styles.adminUserStatValue}>{user.mostActiveModule || user.mostTimeModule}</Text>
            <Text style={styles.adminFeedbackMeta}>{formatDuration(user.mostActiveMs || user.mostTimeMs)} active</Text>
          </View>
        </View>
        <Text style={styles.adminFeedbackMeta}>
          {[user.currentCity, user.currentState, user.currentCountry].filter(Boolean).join(", ") || "No current location saved"}
        </Text>
      </View>
    )) : (
      <View style={styles.adminEmptyCard}>
        <Ionicons color="#7555C7" name="person-add-outline" size={24} />
        <Text style={styles.adminEmptyTitle}>No user insight rows yet</Text>
        <Text style={styles.bodyText}>Once users sign in and click modules, their name, email, activity, strongest modules, and saved feedback will appear here.</Text>
      </View>
    )
  );

  useEffect(() => {
    let active = true;
    loadBackendAdminReport(adminSecret, reportStartDate, reportEndDate).then((nextReport) => {
      if (!active) return;
      if (nextReport) {
        setBackendReport(nextReport);
        setBackendStatus("Connected to real backend database");
      } else {
        setBackendStatus(adminSecret.trim() ? "Admin backend could not be reached" : "Enter the admin report password to unlock live reports");
      }
    });
    return () => {
      active = false;
    };
  }, [adminSecret, reportEndDate, reportStartDate]);

  if (adminReportPage === "user-insights") {
    return (
      <View>
        <View style={styles.adminSubpageHeader}>
          <Pressable onPress={() => setAdminReportPage("overview")} style={styles.adminBackButton}>
            <Ionicons color="#7555C7" name="arrow-back-outline" size={18} />
            <Text style={styles.adminLightButtonText}>Back to reports</Text>
          </Pressable>
          <View style={styles.adminHeroIcon}>
            <Ionicons color="#FFFFFF" name="people-outline" size={30} />
          </View>
          <Text style={styles.adminHeroEyebrow}>Admin dashboard</Text>
          <Text style={styles.adminHeroTitle}>User insights</Text>
          <Text style={styles.adminHeroSubtitle}>
            Review each user's name, email, location, clicks, most active module, and strongest activity patterns.
          </Text>
        </View>

        <View style={styles.adminMetricGrid}>
          <Metric icon="people-outline" label="Saved users" value={report.totalUsers} />
          <Metric icon="person-circle-outline" label="Unique visitors" value={report.uniqueVisitors} />
          <Metric icon="pulse-outline" label="Tracked visits" value={report.totalVisits} />
          <Metric icon="flash-outline" label="Active time" value={formatDuration(report.totalActiveTimeMs || report.totalTimeMs)} />
        </View>

        <View style={styles.adminDateRangeCard}>
          <View style={styles.adminModuleTopline}>
            <Text style={styles.adminStartTitle}>User insight date range</Text>
            <Pressable
              onPress={() => {
                setReportStartDate("");
                setReportEndDate("");
              }}
              style={styles.adminLightButton}
            >
              <Ionicons color="#7555C7" name="refresh-outline" size={17} />
              <Text style={styles.adminLightButtonText}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.adminDateInputRow}>
            <TextInput
              autoCapitalize="none"
              onChangeText={setReportStartDate}
              placeholder="Start YYYY-MM-DD"
              placeholderTextColor="#9A93AA"
              style={styles.adminDateInput}
              value={reportStartDate}
            />
            <TextInput
              autoCapitalize="none"
              onChangeText={setReportEndDate}
              placeholder="End YYYY-MM-DD"
              placeholderTextColor="#9A93AA"
              style={styles.adminDateInput}
              value={reportEndDate}
            />
          </View>
          <Text style={styles.adminFeedbackMeta}>This date range also controls the CSV export.</Text>
        </View>

        <Pressable onPress={downloadUserInsights} style={styles.adminDownloadButton}>
          <Ionicons color="#FFFFFF" name="download-outline" size={18} />
          <Text style={styles.primaryButtonText}>Download user insights CSV</Text>
        </Pressable>

        <Text style={styles.adminSectionTitle}>Users</Text>
        {renderUserInsightsList()}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.adminHero}>
        <View style={styles.adminHeroIcon}>
          <Ionicons color="#FFFFFF" name="analytics-outline" size={30} />
        </View>
        <Text style={styles.adminHeroEyebrow}>Admin dashboard</Text>
        <Text style={styles.adminHeroTitle}>Intuisity reporting</Text>
        <Text style={styles.adminHeroSubtitle}>
          See users, module activity, time spent, saved feedback, and exportable customer insights in one place.
        </Text>
      </View>

      <View style={styles.adminInsightCard}>
        <View style={styles.adminStatusIcon}>
          <Ionicons color="#008A94" name={backendReport ? "checkmark-circle-outline" : "desktop-outline"} size={24} />
        </View>
        <View style={styles.adminInsightCopy}>
          <Text style={styles.adminInsightTitle}>{backendStatus}</Text>
          <Text style={styles.adminInsightText}>Most used area: {report.mostUsedModule}</Text>
          <Text style={styles.adminStatusMeta}>
            {backendReport ? "Live Supabase data" : "Local browser fallback"}
          </Text>
        </View>
      </View>

      <View style={styles.adminSecretCard}>
        <View style={styles.adminSecretHeader}>
          <Ionicons color="#7555C7" name="lock-closed-outline" size={22} />
          <View style={styles.adminInsightCopy}>
            <Text style={styles.adminStartTitle}>Admin report password</Text>
            <Text style={styles.adminStartText}>
              This unlocks private reporting data and protects the raw report links.
            </Text>
          </View>
        </View>
        <TextInput
          autoCapitalize="none"
          onChangeText={(value) => {
            setAdminSecret(value);
            saveAdminSecret(value);
            setAdminSecretSavedAt(value.trim() ? "Saved on this device" : "");
          }}
          onBlur={saveAdminPasswordForDevice}
          placeholder="Enter admin report password"
          placeholderTextColor="#9A93AA"
          secureTextEntry={!showAdminSecret}
          style={styles.adminSecretInput}
          value={adminSecret}
        />
        <View style={styles.adminSecretActions}>
          <Pressable onPress={() => setShowAdminSecret((current) => !current)} style={styles.adminLightButton}>
            <Ionicons color="#7555C7" name={showAdminSecret ? "eye-off-outline" : "eye-outline"} size={17} />
            <Text style={styles.adminLightButtonText}>{showAdminSecret ? "Hide" : "Show"}</Text>
          </Pressable>
          <Pressable onPress={saveAdminPasswordForDevice} style={styles.adminLightButton}>
            <Ionicons color="#008A94" name="save-outline" size={17} />
            <Text style={styles.adminLightButtonText}>Save on this device</Text>
          </Pressable>
        </View>
        {adminSecretSavedAt ? (
          <Text style={styles.adminSavedText}>{adminSecretSavedAt}</Text>
        ) : (
          <Text style={styles.adminFeedbackMeta}>Enter the same value you saved in Vercel as INTUISITY_ADMIN_SECRET.</Text>
        )}
      </View>

      {!hasActivity && (
        <View style={styles.adminStartCard}>
          <Ionicons color="#7555C7" name="sparkles-outline" size={26} />
          <View style={styles.adminInsightCopy}>
            <Text style={styles.adminStartTitle}>No live activity recorded yet</Text>
            <Text style={styles.adminStartText}>
              Sign in on the live website, open a few modules, complete a challenge, and save feedback. Then return here to see the report fill in.
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.adminSectionTitle}>Backend save check</Text>
      {recentBackendSaves.length ? (
        recentBackendSaves.slice(0, 6).map((entry, index) => (
          <View key={`${entry.path}-${entry.savedAt}-${index}`} style={styles.adminFeedbackCard}>
            <View style={styles.adminModuleTopline}>
              <Text style={styles.adminModuleLabel}>{entry.path}</Text>
              <View style={[styles.adminUserPill, !entry.ok && styles.adminWarningPill]}>
                <Text style={styles.adminUserPillText}>{entry.ok ? "Saved" : "Needs fix"}</Text>
              </View>
            </View>
            <Text style={styles.bodyText}>{entry.message}</Text>
            <Text style={styles.adminFeedbackMeta}>{formatReportDate(entry.savedAt)}{entry.status ? ` · status ${entry.status}` : ""}</Text>
          </View>
        ))
      ) : (
        <View style={styles.adminEmptyCard}>
          <Ionicons color="#008A94" name="cloud-upload-outline" size={24} />
          <Text style={styles.adminEmptyTitle}>No backend save attempts in this browser yet</Text>
          <Text style={styles.bodyText}>Sign in, open a challenge for a few seconds, complete results, or save feedback. Then come back here to see whether those saves reached Supabase.</Text>
        </View>
      )}

      <View style={styles.adminMetricGrid}>
        {summaryMetrics.map((metric) => (
          <Metric key={metric.label} icon={metric.icon} label={metric.label} value={metric.value} />
        ))}
      </View>

      <Text style={styles.adminSectionTitle}>Visitor volume</Text>
      <View style={styles.adminVolumeGrid}>
        <Metric icon="today-outline" label="Today" value={report.visitorVolume?.today || 0} />
        <Metric icon="calendar-outline" label="Last 7 days" value={report.visitorVolume?.week || 0} />
        <Metric icon="calendar-number-outline" label="Last 30 days" value={report.visitorVolume?.month || 0} />
        <Metric icon="filter-outline" label="Selected range" value={report.visitorVolume?.range || report.uniqueVisitors || 0} />
      </View>
      <View style={styles.adminDateRangeCard}>
        <View style={styles.adminModuleTopline}>
          <Text style={styles.adminStartTitle}>Date range</Text>
          <Pressable
            onPress={() => {
              setReportStartDate("");
              setReportEndDate("");
            }}
            style={styles.adminLightButton}
          >
            <Ionicons color="#7555C7" name="refresh-outline" size={17} />
            <Text style={styles.adminLightButtonText}>Clear</Text>
          </Pressable>
        </View>
        <View style={styles.adminDateInputRow}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setReportStartDate}
            placeholder="Start YYYY-MM-DD"
            placeholderTextColor="#9A93AA"
            style={styles.adminDateInput}
            value={reportStartDate}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setReportEndDate}
            placeholder="End YYYY-MM-DD"
            placeholderTextColor="#9A93AA"
            style={styles.adminDateInput}
            value={reportEndDate}
          />
        </View>
        <Text style={styles.adminFeedbackMeta}>Leave blank to show all recorded activity.</Text>
      </View>

      <Text style={styles.adminSectionTitle}>Visitors over time</Text>
      {report.visitorTrend?.length ? (
        <View style={styles.adminTrendCard}>
          <View style={styles.adminTrendGraph}>
            {(report.visitorTrend || []).slice(-14).map((day) => (
              <View key={day.date} style={styles.adminTrendBarWrap}>
                <View
                  style={[
                    styles.adminTrendBar,
                    { height: `${Math.max(8, Math.round((day.uniqueVisitors / visitorTrendMax) * 100))}%` }
                  ]}
                />
                <Text style={styles.adminTrendLabel}>{day.date.slice(5)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.adminTrendTable}>
            <View style={[styles.adminTrendRow, styles.adminTrendHeaderRow]}>
              <Text style={styles.adminTrendHeaderText}>Date</Text>
              <Text style={styles.adminTrendHeaderText}>Unique</Text>
              <Text style={styles.adminTrendHeaderText}>Visits</Text>
            </View>
            {visitorTrendRows.map((day) => (
              <View key={`row-${day.date}`} style={styles.adminTrendRow}>
                <Text style={styles.adminTrendCell}>{day.date}</Text>
                <Text style={styles.adminTrendCell}>{day.uniqueVisitors}</Text>
                <Text style={styles.adminTrendCell}>{day.visits}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.adminEmptyCard}>
          <Ionicons color="#008A94" name="bar-chart-outline" size={24} />
          <Text style={styles.adminEmptyTitle}>No visitor trend yet</Text>
          <Text style={styles.bodyText}>As users visit modules, daily unique visitor and visit counts will appear here.</Text>
        </View>
      )}

      <Text style={styles.adminSectionTitle}>User insights</Text>
      <View style={styles.adminInsightOpenCard}>
        <View style={styles.adminInsightCopy}>
          <Text style={styles.adminStartTitle}>Open user insights page</Text>
          <Text style={styles.adminStartText}>
            See the full user list, date range controls, and CSV export on a separate report page.
          </Text>
        </View>
        <Pressable onPress={() => setAdminReportPage("user-insights")} style={styles.adminLightButton}>
          <Ionicons color="#7555C7" name="open-outline" size={17} />
          <Text style={styles.adminLightButtonText}>Open</Text>
        </Pressable>
      </View>
      {report.userInsights?.length ? renderUserInsightsList(3) : (
        <View style={styles.adminEmptyCard}>
          <Ionicons color="#7555C7" name="person-add-outline" size={24} />
          <Text style={styles.adminEmptyTitle}>No user insight rows yet</Text>
          <Text style={styles.bodyText}>Once users sign in and click modules, their name, email, activity, strongest modules, and saved feedback will appear here.</Text>
        </View>
      )}

      <Text style={styles.adminSectionTitle}>Time by module graph</Text>
      <View style={styles.adminTrendCard}>
        <View style={styles.adminRangeSelector}>
          {[1, 7, 14, 30].map((days) => (
            <Pressable
              key={days}
              onPress={() => setModuleTrendDays(days as 1 | 7 | 14 | 30)}
              style={[styles.adminRangeButton, moduleTrendDays === days && styles.adminRangeButtonSelected]}
            >
              <Text style={[styles.adminRangeButtonText, moduleTrendDays === days && styles.adminRangeButtonTextSelected]}>
                {days === 1 ? "1 day" : `${days} days`}
              </Text>
            </Pressable>
          ))}
        </View>
        {moduleTrendRows.length ? (
          <View>
            <View style={styles.adminModuleTrendGraph}>
              {moduleTrendRows.map((day) => (
                <View key={day.date} style={styles.adminModuleTrendDay}>
                  <View style={styles.adminModuleTrendStack}>
                    {day.modules.map((module) => {
                      const labelIndex = Math.max(0, moduleTrendLabels.indexOf(module.moduleLabel));
                      return (
                        <View
                          key={`${day.date}-${module.moduleLabel}`}
                          style={[
                            styles.adminModuleTrendSegment,
                            {
                              backgroundColor: moduleTrendColors[labelIndex % moduleTrendColors.length],
                              height: `${Math.max(5, Math.round(((module.activeMs || module.totalMs) / moduleTrendMax) * 100))}%`
                            }
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text style={styles.adminTrendLabel}>{moduleTrendDays === 1 ? day.date : day.date.slice(5)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.adminModuleLegend}>
              {moduleTrendLabels.map((label, index) => (
                <View key={label} style={styles.adminLegendItem}>
                  <View style={[styles.adminLegendDot, { backgroundColor: moduleTrendColors[index % moduleTrendColors.length] }]} />
                  <Text style={styles.adminLegendText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.adminEmptyCard}>
            <Ionicons color="#008A94" name="stats-chart-outline" size={24} />
            <Text style={styles.adminEmptyTitle}>No daily module graph yet</Text>
            <Text style={styles.bodyText}>As people use modules each day, this graph will show where time is being spent over 1, 7, 14, or 30 days.</Text>
          </View>
        )}
      </View>

      <Text style={styles.adminSectionTitle}>Time by module</Text>
      {report.moduleSummaries.length ? report.moduleSummaries.map((module) => (
        <View key={module.moduleLabel} style={styles.adminModuleRow}>
          <View style={styles.adminModuleTopline}>
            <Text style={styles.adminModuleLabel}>{module.moduleLabel}</Text>
            <Text style={styles.adminValue}>{formatDuration(module.activeMs || module.totalMs)}</Text>
          </View>
          <View style={styles.adminTrack}>
            <View
              style={[
                styles.adminTrackFill,
                { width: `${Math.min(100, Math.max(8, Math.round(((module.activeMs || module.totalMs) / Math.max(report.totalActiveTimeMs || report.totalTimeMs, 1)) * 100)))}%` }
              ]}
            />
          </View>
          <Text style={styles.adminModuleMeta}>
            {module.visits} visits · {formatDuration(module.averageActiveMs || module.averageMs)} average active · {formatDuration(module.totalMs)} total page time
          </Text>
        </View>
      )) : (
        <View style={styles.adminEmptyCard}>
          <Ionicons color="#008A94" name="hourglass-outline" size={24} />
          <Text style={styles.adminEmptyTitle}>No module time yet</Text>
          <Text style={styles.bodyText}>Open a challenge on the live site, spend a few seconds there, then return here after the backend saves the visit.</Text>
        </View>
      )}

      <Text style={styles.adminSectionTitle}>Report page responses</Text>
      <View style={styles.adminRow}>
        <Text style={styles.bodyText}>Average rating</Text>
        <Text style={styles.adminValue}>{report.averageRating ? `${report.averageRating}/10` : "No ratings yet"}</Text>
      </View>
      <View style={styles.adminRow}>
        <Text style={styles.bodyText}>Saved comment responses</Text>
        <Text style={styles.adminValue}>{report.improvementResponses.length}</Text>
      </View>
      {report.improvementResponses.length ? report.improvementResponses.map((note, index) => (
        <View key={`${note.moduleLabel}-${index}`} style={styles.adminFeedbackCard}>
          <Text style={styles.adminModuleLabel}>{note.moduleLabel}</Text>
          <Text style={styles.adminFeedbackMeta}>
            {note.email}{note.savedAt ? ` · ${formatReportDate(note.savedAt)}` : ""}
          </Text>
          <Text style={styles.bodyText}>{note.note}</Text>
          <Text style={styles.trend}>{note.rating ? `${note.rating}/10` : "No star rating"}</Text>
        </View>
      )) : (
        <View style={styles.adminEmptyCard}>
          <Ionicons color="#7555C7" name="chatbubble-ellipses-outline" size={24} />
          <Text style={styles.adminEmptyTitle}>No written responses yet</Text>
          <Text style={styles.bodyText}>Ratings and improvement comments from the results page will show here for review.</Text>
        </View>
      )}
    </View>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.kicker}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.metric}>
      {icon && (
        <View style={styles.metricIcon}>
          <Ionicons color="#008A94" name={icon} size={18} />
        </View>
      )}
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function formatReportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function updateWebMetadata() {
  const documentRef = (globalThis as any).document;
  if (!documentRef) return;

  documentRef.title = "Intuisity | Intuition Training, Remote Viewing, and Inner Knowing";
  setMetaTag("description", seoDescription);
  setMetaTag("keywords", seoKeywords.join(", "));
  setMetaTag("og:title", "Intuisity | Awaken Your Intuition. Expand Your Awareness.", "property");
  setMetaTag("og:description", seoDescription, "property");
}

function setMetaTag(name: string, content: string, attribute = "name") {
  const documentRef = (globalThis as any).document;
  if (!documentRef) return;
  let tag = documentRef.querySelector(`meta[${attribute}="${name}"]`);
  if (!tag) {
    tag = documentRef.createElement("meta");
    tag.setAttribute(attribute, name);
    documentRef.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

const styles = StyleSheet.create({
  accountScreen: { backgroundColor: "#FFFFFF", flex: 1, justifyContent: "center", padding: 24 },
  accountFormScreen: { backgroundColor: "#FFFFFF", flex: 1 },
  accountFormContent: { padding: 24, paddingBottom: 50 },
  signupBanner: { alignSelf: "stretch", borderRadius: 10, height: 150, marginBottom: 18, width: "100%" },
  accountHero: { alignItems: "center", backgroundColor: "#6544B8", borderColor: "#63E3E0", borderRadius: 8, borderWidth: 2, marginBottom: 20, padding: 30 },
  accountHeroTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 12, textAlign: "center" },
  accountHeroText: { color: "#EEE8FF", fontSize: 15, lineHeight: 22, marginTop: 10, textAlign: "center" },
  freePlayBadge: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#63E3E0", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 7, marginTop: 16, paddingHorizontal: 14, paddingVertical: 8 },
  freePlayBadgeText: { color: "#6544B8", fontSize: 13, fontWeight: "900" },
  accountTitle: { color: "#201B35", fontSize: 28, fontWeight: "900", marginBottom: 8 },
  accountSubtitle: { color: "#706982", fontSize: 15, lineHeight: 22, marginBottom: 20 },
  loginFreePlayNote: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 7, marginBottom: 16, marginTop: -8, paddingHorizontal: 12, paddingVertical: 8 },
  loginFreePlayText: { color: "#008A94", fontSize: 12, fontWeight: "900" },
  googleButton: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#DAD3E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 12, minHeight: 48, padding: 12 },
  googleIconCircle: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7E3F2", borderRadius: 999, borderWidth: 1, height: 26, justifyContent: "center", width: 26 },
  googleIconText: { color: "#4285F4", fontSize: 16, fontWeight: "900" },
  googleButtonText: { color: "#30264C", fontSize: 15, fontWeight: "900" },
  loginDivider: { alignItems: "center", flexDirection: "row", gap: 10, marginBottom: 12, marginTop: 2 },
  loginDividerLine: { backgroundColor: "#E7E3F2", flex: 1, height: 1 },
  loginDividerText: { color: "#706982", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  accountGroupLabel: { color: "#6544B8", fontSize: 16, fontWeight: "900", marginBottom: 10, marginTop: 12 },
  languageSetup: { marginBottom: 14 },
  languageSetupHeader: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 10 },
  languageSetupDefault: { color: "#706982", fontSize: 11, lineHeight: 16 },
  signupLanguageMenu: { backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, marginTop: 6, padding: 6 },
  accountField: { marginBottom: 12 },
  accountFieldLabel: { color: "#393149", fontSize: 13, fontWeight: "800", marginBottom: 6 },
  accountInputWrap: { position: "relative" },
  accountInput: { backgroundColor: "#FFFFFF", borderColor: "#DAD3E8", borderRadius: 8, borderWidth: 1, color: "#30264C", fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  accountPasswordInput: { paddingRight: 50 },
  passwordVisibilityButton: { alignItems: "center", bottom: 0, justifyContent: "center", position: "absolute", right: 6, top: 0, width: 42 },
  savedAccountList: { marginBottom: 14 },
  savedAccountLabel: { color: "#706982", fontSize: 11, fontWeight: "900", marginBottom: 7, textTransform: "uppercase" },
  savedAccountButton: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 9, marginBottom: 7, padding: 10 },
  savedAccountButtonSelected: { backgroundColor: "#008A94", borderColor: "#00AEBB" },
  savedAccountCopy: { flex: 1 },
  savedAccountName: { color: "#30264C", fontSize: 13, fontWeight: "900" },
  savedAccountEmail: { color: "#706982", fontSize: 11, marginTop: 2 },
  savedAccountAction: { color: "#008A94", fontSize: 10, fontWeight: "900", marginTop: 3 },
  savedAccountTextSelected: { color: "#FFFFFF" },
  stateSuggestions: { backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, marginTop: 4, overflow: "hidden" },
  stateSuggestion: { alignItems: "center", borderBottomColor: "#EEEAF5", borderBottomWidth: 1, flexDirection: "row", gap: 8, minHeight: 40, paddingHorizontal: 12, paddingVertical: 8 },
  stateSuggestionText: { color: "#30264C", fontSize: 14, fontWeight: "700" },
  reminderNotice: { alignItems: "center", backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 14, padding: 12 },
  reminderNoticeCopy: { flex: 1 },
  reminderNoticeTitle: { color: "#30264C", fontSize: 13, fontWeight: "900" },
  reminderNoticeText: { color: "#706982", fontSize: 11, lineHeight: 16, marginTop: 2 },
  reminderNoticeTimeZone: { color: "#008A94", fontSize: 11, fontWeight: "900", lineHeight: 16, marginTop: 4 },
  reminderTimeInput: { backgroundColor: "#FFFFFF", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, color: "#30264C", fontSize: 15, fontWeight: "800", marginTop: 8, maxWidth: 150, paddingHorizontal: 12, paddingVertical: 9 },
  accountError: { color: "#B34B56", fontSize: 13, fontWeight: "700", marginBottom: 12 },
  accountHint: { color: "#706982", fontSize: 12, fontWeight: "700", marginBottom: 10, marginTop: -4 },
  passwordRules: { backgroundColor: "#F8F7FC", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, marginBottom: 12, marginTop: -2, padding: 10 },
  passwordRulesTitle: { color: "#30264C", fontSize: 13, fontWeight: "900", marginBottom: 7 },
  passwordRuleRow: { alignItems: "center", flexDirection: "row", gap: 7, marginBottom: 5 },
  passwordRuleText: { color: "#706982", flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 16 },
  passwordRuleTextPassed: { color: "#008A94" },
  forgotPasswordButton: { alignSelf: "flex-end", marginBottom: 14, marginTop: -4, paddingHorizontal: 4, paddingVertical: 4 },
  forgotPasswordText: { color: "#6544B8", fontSize: 13, fontWeight: "900" },
  accountSecondaryButton: { alignItems: "center", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, justifyContent: "center", minHeight: 48, padding: 12 },
  accountSecondaryText: { color: "#008A94", fontSize: 15, fontWeight: "900" },
  legalLinks: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16 },
  legalLinkButton: { paddingHorizontal: 4, paddingVertical: 4 },
  legalLinkDivider: { color: "#B8AFCB", fontSize: 12, fontWeight: "800" },
  legalLinkText: { color: "#6544B8", fontSize: 12, fontWeight: "900" },
  app: {
    backgroundColor: "#FFFFFF",
    flex: 1
  },
  floatingScore: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8
  },
  profileBadge: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 42, paddingHorizontal: 12, paddingVertical: 8 },
  profileBadgeText: { color: "#30264C", flexShrink: 1, fontSize: 13, fontWeight: "800" },
  topRightActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  languageButton: { alignItems: "center", backgroundColor: "#EDFBFB", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 3, height: 42, justifyContent: "center", paddingHorizontal: 8 },
  languageButtonText: { color: "#008A94", fontSize: 10, fontWeight: "900" },
  logoutIconButton: { alignItems: "center", backgroundColor: "#F8F7FC", borderColor: "#BFE8E8", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 6, height: 42, justifyContent: "center", paddingHorizontal: 10 },
  logoutIconText: { color: "#6544B8", fontSize: 12, fontWeight: "900" },
  languageMenu: { backgroundColor: "#FFFFFF", borderColor: "#DCCFF5", borderRadius: 8, borderWidth: 1, elevation: 12, left: 18, padding: 6, position: "absolute", right: 18, shadowColor: "#30264C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, top: 58, zIndex: 20 },
  languageMenuOption: { alignItems: "center", borderRadius: 7, flexDirection: "row", justifyContent: "space-between", minHeight: 38, paddingHorizontal: 10, paddingVertical: 6 },
  languageMenuOptionSelected: { backgroundColor: "#008A94" },
  languageMenuNative: { color: "#30264C", fontSize: 13, fontWeight: "900" },
  languageMenuEnglish: { color: "#706982", fontSize: 11 },
  languageMenuTextSelected: { color: "#FFFFFF" },
  kicker: {
    color: "#7555C7",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#19162B",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4
  },
  content: {
    padding: 18,
    paddingBottom: 112
  },
  sectionHeader: {
    marginBottom: 16
  },
  sectionTitle: {
    color: "#201B35",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6
  },
  sectionSubtitle: {
    color: "#706982",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },
  adminHero: {
    backgroundColor: "#6544B8",
    borderColor: "#63E3E0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 18
  },
  adminHeroIcon: {
    alignItems: "center",
    backgroundColor: "#008A94",
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: 8,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    marginBottom: 12,
    width: 52
  },
  adminHeroEyebrow: {
    color: "#CFFDFC",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  adminHeroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 5
  },
  adminHeroSubtitle: {
    color: "#EEE8FF",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  adminSubpageHeader: {
    backgroundColor: "#6544B8",
    borderColor: "#63E3E0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 18
  },
  adminBackButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  adminMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 8
  },
  adminVolumeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 10
  },
  metric: {
    backgroundColor: "#F8F7FC",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 118,
    padding: 12,
    width: "48%"
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: "#EDFBFB",
    borderColor: "#BFE8E8",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    marginBottom: 8,
    width: 34
  },
  metricValue: {
    color: "#30264C",
    fontSize: 22,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#756D87",
    fontSize: 12,
    marginTop: 4
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  focusCard: {
    borderColor: "#00AEBB",
    borderWidth: 2
  },
  cardCount: {
    color: "#7555C7",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  cardTitle: {
    color: "#211B34",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 23
  },
  bodyText: {
    color: "#6E687A",
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  challengeTagline: {
    color: "#00AEBB",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 3
  },
  choiceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  colorChoiceGrid: {
    alignSelf: "center",
    maxWidth: 340,
    width: "100%"
  },
  choice: {
    backgroundColor: "#F8F7FC",
    borderColor: "#E4DFF0",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    minWidth: "47%",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  colorChoice: {
    alignItems: "center",
    aspectRatio: 1,
    borderColor: "rgba(255,255,255,0.8)",
    borderWidth: 3,
    justifyContent: "center",
    minHeight: 0,
    minWidth: "47%",
    padding: 8
  },
  colorChoiceSelected: {
    borderColor: "#30264C",
    borderWidth: 5,
    shadowColor: "#30264C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8
  },
  colorChoiceText: {
    color: "#FFFFFF",
    fontSize: 17,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  choiceSelected: {
    backgroundColor: "#7555C7",
    borderColor: "#7555C7"
  },
  choiceText: {
    color: "#393149",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center"
  },
  choiceTextSelected: {
    color: "#FFFFFF"
  },
  remotePanel: {
    alignItems: "center",
    backgroundColor: "#F2FAFA",
    borderColor: "#CDE9E9",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14
  },
  remotePrompt: {
    color: "#30264C",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#7555C7",
    borderColor: "#63E3E0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  disabledButton: {
    opacity: 0.45
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  resultText: {
    color: "#008A94",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  rowCenter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  statusPill: {
    backgroundColor: "#F1EDFF",
    borderRadius: 8,
    color: "#6544B8",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
    textAlign: "center"
  },
  price: {
    color: "#211B34",
    fontSize: 30,
    fontWeight: "900"
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  adminRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 14
  },
  adminInsightCard: {
    alignItems: "center",
    backgroundColor: "#EDFBFB",
    borderColor: "#BFE8E8",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    padding: 14
  },
  adminInsightOpenCard: {
    alignItems: "center",
    backgroundColor: "#F8F5FF",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14
  },
  adminStatusIcon: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#BFE8E8",
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  adminInsightCopy: {
    flex: 1
  },
  adminInsightTitle: {
    color: "#30264C",
    fontSize: 13,
    fontWeight: "900"
  },
  adminInsightText: {
    color: "#008A94",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3
  },
  adminStatusMeta: {
    color: "#706982",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4
  },
  adminStartCard: {
    alignItems: "flex-start",
    backgroundColor: "#F8F5FF",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    padding: 14
  },
  adminStartTitle: {
    color: "#30264C",
    fontSize: 15,
    fontWeight: "900"
  },
  adminStartText: {
    color: "#706982",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  adminSecretCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  adminSecretHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginBottom: 10
  },
  adminSecretInput: {
    backgroundColor: "#F8F7FC",
    borderColor: "#DAD3E8",
    borderRadius: 8,
    borderWidth: 1,
    color: "#30264C",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  adminSecretActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9
  },
  adminLightButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  adminLightButtonText: {
    color: "#4D3A7A",
    fontSize: 12,
    fontWeight: "900"
  },
  adminSavedText: {
    color: "#008A94",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8
  },
  adminSectionTitle: {
    color: "#30264C",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 6
  },
  adminDateRangeCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12
  },
  adminDateInputRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  adminDateInput: {
    backgroundColor: "#F8F7FC",
    borderColor: "#DAD3E8",
    borderRadius: 8,
    borderWidth: 1,
    color: "#30264C",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    minWidth: 145,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  adminTrendCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12
  },
  adminTrendGraph: {
    alignItems: "flex-end",
    backgroundColor: "#F8F7FC",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    height: 145,
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingTop: 12
  },
  adminTrendBarWrap: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end"
  },
  adminTrendBar: {
    backgroundColor: "#00AEBB",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 8,
    width: "72%"
  },
  adminTrendLabel: {
    color: "#706982",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
    minHeight: 16
  },
  adminTrendTable: {
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  adminTrendRow: {
    alignItems: "center",
    borderTopColor: "#E7E3F2",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  adminTrendHeaderRow: {
    backgroundColor: "#F8F5FF",
    borderTopWidth: 0
  },
  adminTrendHeaderText: {
    color: "#6544B8",
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  adminTrendCell: {
    color: "#30264C",
    flex: 1,
    fontSize: 12,
    fontWeight: "800"
  },
  adminRangeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
  },
  adminRangeButton: {
    alignItems: "center",
    backgroundColor: "#F8F7FC",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    minWidth: 68,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  adminRangeButtonSelected: {
    backgroundColor: "#7555C7",
    borderColor: "#7555C7"
  },
  adminRangeButtonText: {
    color: "#6544B8",
    fontSize: 12,
    fontWeight: "900"
  },
  adminRangeButtonTextSelected: {
    color: "#FFFFFF"
  },
  adminModuleTrendGraph: {
    alignItems: "flex-end",
    backgroundColor: "#F8F7FC",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 180,
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingTop: 12
  },
  adminModuleTrendDay: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end"
  },
  adminModuleTrendStack: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    height: "86%",
    justifyContent: "center",
    width: "100%"
  },
  adminModuleTrendSegment: {
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    minHeight: 5,
    width: 7
  },
  adminModuleLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  adminLegendItem: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E3F2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  adminLegendDot: {
    borderRadius: 999,
    height: 9,
    width: 9
  },
  adminLegendText: {
    color: "#706982",
    fontSize: 11,
    fontWeight: "800"
  },
  adminModuleRow: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14
  },
  adminModuleTopline: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  adminModuleLabel: {
    color: "#30264C",
    flex: 1,
    fontSize: 14,
    fontWeight: "900"
  },
  adminTrack: {
    backgroundColor: "#F1EDFF",
    borderRadius: 8,
    height: 9,
    marginTop: 12,
    overflow: "hidden"
  },
  adminTrackFill: {
    backgroundColor: "#00AEBB",
    borderRadius: 8,
    height: "100%"
  },
  adminModuleMeta: {
    color: "#706982",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8
  },
  adminDownloadButton: {
    alignItems: "center",
    backgroundColor: "#7555C7",
    borderColor: "#63E3E0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 10,
    padding: 12
  },
  adminUserCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DCCFF5",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 9,
    padding: 13
  },
  adminUserPill: {
    backgroundColor: "#EDFBFB",
    borderColor: "#BFE8E8",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  adminWarningPill: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F3B4B4"
  },
  adminUserPillText: {
    color: "#008A94",
    fontSize: 12,
    fontWeight: "900"
  },
  adminUserIdentity: {
    flex: 1,
    paddingRight: 10
  },
  adminUserStatsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    marginTop: 10
  },
  adminUserStat: {
    backgroundColor: "#F8F7FC",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10
  },
  adminUserStatLabel: {
    color: "#706982",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase"
  },
  adminUserStatValue: {
    color: "#30264C",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17
  },
  adminEmptyCard: {
    alignItems: "flex-start",
    backgroundColor: "#F8F7FC",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  adminEmptyTitle: {
    color: "#30264C",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5,
    marginTop: 8
  },
  adminFeedbackCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
    padding: 14
  },
  adminFeedbackMeta: {
    color: "#008A94",
    fontSize: 12,
    fontWeight: "800"
  },
  adminValue: {
    color: "#211B34",
    fontSize: 17,
    fontWeight: "900"
  },
  trend: {
    color: "#4DAA57",
    fontSize: 13,
    fontWeight: "900"
  },
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E7E3F2",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: 6,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 10,
    position: "absolute",
    right: 0
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    minHeight: 58,
    justifyContent: "center",
    paddingVertical: 6
  },
  tabButtonSelected: {
    backgroundColor: "#F1EDFF"
  },
  tabLabel: {
    color: "#756D87",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4
  },
  tabLabelSelected: {
    color: "#6544B8"
  },
  hero: {
    borderRadius: 8,
    height: 270,
    justifyContent: "flex-end",
    marginBottom: 14,
    overflow: "hidden",
    position: "relative"
  },
  heroImage: {
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0,
    width: "100%"
  },
  heroCopy: {
    backgroundColor: "rgba(30, 17, 55, 0.72)",
    padding: 16
  },
  heroEyebrow: {
    color: "#63E3E0",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 4
  },
  progressRow: {
    marginBottom: 16
  },
  progressText: {
    color: "#6E6585",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7
  },
  progressTrack: {
    backgroundColor: "#EAE6F4",
    borderRadius: 8,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: "#00AEBB",
    borderRadius: 8,
    height: "100%"
  },
  resultsPanel: {
    alignItems: "center",
    backgroundColor: "#F8F7FC",
    borderColor: "#E7E3F2",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 20,
    paddingVertical: 34
  },
  resultsNumber: {
    color: "#30264C",
    fontSize: 52,
    fontWeight: "900",
    marginTop: 10
  },
  resultsLabel: {
    color: "#706982",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2
  },
  resultsPoints: {
    color: "#00AEBB",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14
  },
  reviewHeading: {
    color: "#30264C",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 8
  },
  reviewCard: {
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
    padding: 14
  },
  reviewCardCorrect: {
    backgroundColor: "#EDFFF6",
    borderColor: "#43C987",
    shadowColor: "#43C987",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12
  },
  reviewCardIncorrect: {
    backgroundColor: "#FFF8F8",
    borderColor: "#E8C7CA"
  },
  reviewTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  reviewIcon: {
    alignItems: "center",
    backgroundColor: "#F4E5E7",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  reviewIconCorrect: {
    backgroundColor: "#36B978"
  },
  reviewCopy: {
    flex: 1
  },
  reviewTitle: {
    color: "#30264C",
    fontSize: 16,
    fontWeight: "900"
  },
  reviewAnswer: {
    color: "#706982",
    fontSize: 14,
    marginTop: 12
  },
  reviewAnswerStrong: {
    color: "#30264C",
    fontWeight: "900"
  },
  correctAnswer: {
    color: "#B15A60",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 5
  },
  rewardReveal: {
    borderRadius: 8,
    marginTop: 14,
    overflow: "hidden",
    position: "relative"
  },
  rewardImage: {
    aspectRatio: 4 / 3,
    width: "100%"
  },
  rewardMessage: {
    alignItems: "center",
    backgroundColor: "rgba(48, 38, 76, 0.76)",
    bottom: 0,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    left: 0,
    padding: 12,
    position: "absolute",
    right: 0
  },
  rewardMessageText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900"
  }
});
