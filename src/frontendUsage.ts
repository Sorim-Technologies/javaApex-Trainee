import apexfinalImage from "./assets/apexfinal.png";
import apexLogoImage from "./assets/apexlogo.png";
import javaPexFinalImage from "./assets/javapexfinal.png";
import reactLogoImage from "./assets/react.svg";
import DependencyList from "./components/discovery/DependencyList";
import Header from "./components/layout/Header";
import CodeDiffViewer from "./components/migration/CodeDiffViewer";
import DependencyUpgradePreview from "./components/migration/DependencyUpgradePreview";
import MigrationPreview from "./components/migration/MigrationPreview";
import MigrationPreviewPanel from "./components/migration/MigrationPreviewPanel";
import ModernizationCards from "./components/migration/ModernizationCards";
import LandingPage from "./components/pages/LandingPage";
import CodeChangesReport from "./components/result/CodeChangesReport";
import DownloadButtons from "./components/result/DownloadButtons";
import FinalRepoCard from "./components/result/FinalRepoCard";
import FossaReport from "./components/result/FossaReport";
import ReportSummary from "./components/result/ReportSummary";
import SonarReport from "./components/result/SonarReport";
import Sidebar from "./components/shared/Sidebar";
import StepCards from "./components/shared/StepCards";
import TopBar from "./components/shared/TopBar";
import AssessmentCard from "./components/strategy/AssessmentCard";
import ConversionSelector from "./components/strategy/ConversionSelector";
import JavaRecommendationCard from "./components/strategy/JavaRecommendationCard";
import JavaRecommendationList from "./components/strategy/JavaRecommendationList";
import MigrationApproachSelector from "./components/strategy/MigrationApproachSelector";
import MigrationOptions from "./components/strategy/MigrationOptions";
import WizardButtons from "./components/wizard/WizardButtons";
import WizardHeader from "./components/wizard/WizardHeader";
import { useDiscovery } from "./hooks/useDiscovery";
import { useJavaRecommendations } from "./hooks/useJavaRecommendations";
import { useMigrationRun } from "./hooks/useMigrationRun";
import { useRepositoryConnect } from "./hooks/useRepositoryConnect";
import { useWizardStorage } from "./hooks/useWizardStorage";
import { useZipUpload } from "./hooks/useZipUpload";
import * as constants from "./utils/constants";
import * as diffUtils from "./utils/diffUtils";
import * as javaVersionUtils from "./utils/javaVersionUtils";
import * as storageUtils from "./utils/storageUtils";

import type {} from "./types";
import type {} from "./types/index";
import type {} from "./types/migration";
import type {} from "./types/repository";

export const frontendUsageRegistry = Object.freeze([
  apexfinalImage,
  apexLogoImage,
  javaPexFinalImage,
  reactLogoImage,
  DependencyList,
  Header,
  CodeDiffViewer,
  DependencyUpgradePreview,
  MigrationPreview,
  MigrationPreviewPanel,
  ModernizationCards,
  LandingPage,
  CodeChangesReport,
  DownloadButtons,
  FinalRepoCard,
  FossaReport,
  ReportSummary,
  SonarReport,
  Sidebar,
  StepCards,
  TopBar,
  AssessmentCard,
  ConversionSelector,
  JavaRecommendationCard,
  JavaRecommendationList,
  MigrationApproachSelector,
  MigrationOptions,
  WizardButtons,
  WizardHeader,
  useDiscovery,
  useJavaRecommendations,
  useMigrationRun,
  useRepositoryConnect,
  useWizardStorage,
  useZipUpload,
  constants,
  diffUtils,
  javaVersionUtils,
  storageUtils,
]);
