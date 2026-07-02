import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import DonutSmallRoundedIcon from "@mui/icons-material/DonutSmallRounded";
import JavaIcon from "@mui/icons-material/CoffeeRounded";
import GitHubIcon from "@mui/icons-material/GitHub";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import "./JavaApexDashboard.css";

type StepKey = "connect" | "discovery" | "strategy" | "migration" | "result";
type PageKey = "dashboard" | StepKey | "repositories" | "report" | "history" | "settings";

type Repository = {
  id: number;
  source: string;
  url: string;
  privateToken: boolean;
  createdAt: string;
};

const drawerWidth = 292;
const defaultRepoUrl = "https://github.com/felix-seifert/java-21-maven-project.git";

const initialSteps = [
  { key: "connect" as StepKey, label: "Connect", step: "Step 1 - Active", progress: 100, completed: true, disabled: false, color: "#35c875" },
  { key: "discovery" as StepKey, label: "Discovery", step: "Step 2 - Disabled", progress: 25, completed: false, disabled: true, color: "#2f75ff" },
  { key: "strategy" as StepKey, label: "Strategy", step: "Step 3 - Disabled", progress: 0, completed: false, disabled: true, color: "#ffbd21" },
  { key: "migration" as StepKey, label: "Migration", step: "Step 4 - Disabled", progress: 0, completed: false, disabled: true, color: "#8a35ff" },
  { key: "result" as StepKey, label: "Result", step: "Step 5 - Disabled", progress: 0, completed: false, disabled: true, color: "#ff2e6f" },
];

const managementItems = [
  { key: "repositories" as PageKey, label: "Repositories", icon: StorageRoundedIcon },
  { key: "report" as PageKey, label: "Analysis Report", icon: DescriptionRoundedIcon },
  { key: "history" as PageKey, label: "History", icon: HistoryRoundedIcon },
  { key: "settings" as PageKey, label: "Settings", icon: SettingsRoundedIcon },
];

const reportStats = [
  { label: "Files Scanned", value: "1,248", icon: InsertDriveFileRoundedIcon, color: "#2f75ff" },
  { label: "Java Files", value: "842", icon: CodeRoundedIcon, color: "#12b7c8" },
  { label: "Dependencies", value: "156", icon: HubRoundedIcon, color: "#8a35ff" },
  { label: "Issues Found", value: "12", icon: WarningAmberRoundedIcon, color: "#ff4d63" },
];

function CircularProgressRing({ value, size = 74, stroke = 10 }: { value: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <Box className="ring" sx={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </Box>
  );
}

function SummaryCard({ title, value, detail, icon, tone, progress }: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  tone: "blue" | "green" | "red" | "cyan";
  progress?: number;
}) {
  const Icon = icon;
  return (
    <Card className="summary-card">
      <CardContent className="summary-card-content">
        <Box className={`summary-icon ${tone}`}><Icon /></Box>
        <Box className="summary-copy">
          <Typography className="summary-title">{title}</Typography>
          <Typography className={`summary-value ${tone === "red" ? "danger-text" : tone === "green" ? "success-text" : ""}`}>{value}</Typography>
          <Typography className="summary-detail">{detail}</Typography>
        </Box>
        {typeof progress === "number" && <CircularProgressRing value={progress} />}
      </CardContent>
    </Card>
  );
}

function Sidebar({ activePage, setActivePage, steps, progress }: {
  activePage: PageKey;
  setActivePage: (page: PageKey) => void;
  steps: typeof initialSteps;
  progress: number;
}) {
  return (
    <Box component="aside" className="sidebar" sx={{ width: { xs: "100%", lg: drawerWidth } }}>
      <Box className="logo-block">
        <Box className="java-logo"><JavaIcon /></Box>
        <Box>
          <Typography className="logo-title">Java APEX</Typography>
          <Typography className="logo-subtitle">Full Migration</Typography>
        </Box>
      </Box>

      <Button className={`nav-button ${activePage === "dashboard" ? "active" : ""}`} startIcon={<DashboardRoundedIcon />} onClick={() => setActivePage("dashboard")}>
        Dashboard
      </Button>

      <Typography className="sidebar-section">Migration Flow</Typography>
      <Stack spacing={1}>
        {steps.map((item) => {
          const Icon = item.key === "connect" ? LinkRoundedIcon : item.key === "discovery" ? TravelExploreRoundedIcon : item.key === "strategy" ? AccountTreeRoundedIcon : item.key === "migration" ? RocketLaunchRoundedIcon : FactCheckRoundedIcon;
          return (
            <button
              key={item.key}
              className={`flow-item ${activePage === item.key ? "active" : ""}`}
              onClick={() => setActivePage(item.key)}
              type="button"
            >
              <span className="flow-icon"><Icon fontSize="small" /></span>
              <span className="flow-copy"><strong>{item.label}</strong><small>{item.step}</small></span>
              <span className={item.completed ? "flow-state complete" : "flow-state"}>{item.completed ? <CheckCircleRoundedIcon /> : ""}</span>
            </button>
          );
        })}
      </Stack>

      <Typography className="sidebar-section">Management</Typography>
      <Stack spacing={0.7}>
        {managementItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button key={item.key} className={`nav-button soft ${activePage === item.key ? "active" : ""}`} startIcon={<Icon />} onClick={() => setActivePage(item.key)}>
              {item.label}
            </Button>
          );
        })}
      </Stack>

      <Card className="sidebar-progress-card">
        <Typography className="sidebar-card-title">Migration Progress</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgressRing value={progress} size={58} stroke={8} />
          <Box>
            <Typography className="sidebar-progress-value">{progress}%</Typography>
            <Typography className="sidebar-progress-caption">1 of 4 completed</Typography>
          </Box>
        </Stack>
        <LinearProgress variant="determinate" value={progress} className="sidebar-progress-bar" />
      </Card>
    </Box>
  );
}

function TopHeader() {
  return (
    <Box component="header" className="top-header">
      <Box>
        <Typography className="welcome-title">Welcome, Admin ??</Typography>
        <Typography className="welcome-subtitle">Manage and track your Java migration journey</Typography>
      </Box>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box className="theme-toggle"><LightModeRoundedIcon /><DarkModeRoundedIcon /></Box>
        <IconButton className="header-icon"><Badge color="error" badgeContent={3}><NotificationsNoneRoundedIcon /></Badge></IconButton>
        <Avatar className="admin-avatar">A</Avatar>
        <Typography className="admin-name">Admin</Typography>
        <KeyboardArrowDownRoundedIcon className="muted-icon" />
      </Stack>
    </Box>
  );
}

function RepositoryConnection({ repository, onOpenModal, privateToken, setPrivateToken, onAnalyze }: {
  repository: Repository;
  onOpenModal: () => void;
  privateToken: boolean;
  setPrivateToken: (value: boolean) => void;
  onAnalyze: () => void;
}) {
  return (
    <Card className="dashboard-card connection-card">
      <CardContent>
        <Typography className="card-title">Intelligent Repository Connection</Typography>
        <Typography className="card-subtitle">Initialize migration by providing a repository endpoint. Analysis is automated.</Typography>
        <Box className="repository-panel">
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} className="panel-heading">
            <Typography className="panel-title">Repository Information</Typography>
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onOpenModal}>Insert Repository</Button>
          </Stack>
          <Box className="form-grid">
            <Typography className="field-label">Repository Source</Typography>
            <FormControl fullWidth size="small">
              <Select value={repository.source}>
                <MenuItem value="GitHub"><GitHubIcon fontSize="small" /> GitHub</MenuItem>
              </Select>
            </FormControl>
            <Box />

            <Typography className="field-label">Repository URL</Typography>
            <TextField fullWidth size="small" value={repository.url} InputProps={{ readOnly: true }} />
            <FormControlLabel control={<Checkbox checked={privateToken} onChange={(event) => setPrivateToken(event.target.checked)} />} label="Scan Private Token" />
          </Box>
          <Typography className="helper-text">Public GitHub repositories can be analyzed without a token. If the repository is private, we'll ask for a PAT after detection.</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={2}>
            <Typography className="valid-message"><CheckCircleRoundedIcon /> Valid repository URL</Typography>
            <Button variant="contained" endIcon={<KeyboardArrowDownRoundedIcon className="rotate-arrow" />} onClick={onAnalyze}>Start Migration Analysis</Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

function ProgressOverview({ chartData, progress }: { chartData: Array<{ name: string; value: number; color: string }>; progress: number }) {
  return (
    <Card className="dashboard-card chart-card">
      <CardContent>
        <Typography className="card-title">Migration Progress Overview</Typography>
        <Box className="chart-layout">
          <Box className="donut-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={chartData} dataKey="value" innerRadius={74} outerRadius={112} paddingAngle={1} startAngle={90} endAngle={-270}>
                  {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Box className="donut-center"><strong>{progress}%</strong><span>Completed</span></Box>
          </Box>
          <Stack className="legend-list" spacing={1.5}>
            {chartData.map((item) => (
              <Box className="legend-row" key={item.name}><span style={{ backgroundColor: item.color }} /> <strong>{item.name}</strong><em>{item.value}%</em></Box>
            ))}
          </Stack>
        </Box>
        <Box className="info-strip"><AnalyticsRoundedIcon /> Complete all steps to finish your migration</Box>
      </CardContent>
    </Card>
  );
}

function AnalysisReport({ onDownload }: { onDownload: (format: "pdf" | "xlsx" | "json") => void }) {
  const includes = ["Code Analysis Summary", "Dependency Analysis", "Migration Recommendations", "Issue Details & Fix Suggestions"];

  return (
    <Card className="dashboard-card report-card">
      <CardContent className="report-grid">
        <Box>
          <Typography className="card-title">Analysis Report</Typography>
          <Typography className="card-subtitle">Download detailed analysis report and findings</Typography>
          <Box className="success-box">
            <CheckCircleRoundedIcon />
            <Box><strong>Analysis Completed Successfully</strong><span>Repository analyzed on May 20, 2024 10:30 AM</span></Box>
            <Button variant="outlined" size="small">Re-run Analysis</Button>
          </Box>
          <Box className="stats-grid">
            {reportStats.map((item) => {
              const Icon = item.icon;
              return <Box className="report-stat" key={item.label}><Box className="report-stat-icon" sx={{ color: item.color }}><Icon /></Box><Box><span>{item.label}</span><strong>{item.value}</strong></Box></Box>;
            })}
          </Box>
        </Box>
        <Box className="download-panel">
          <Typography className="panel-title">Download Report</Typography>
          <Typography className="card-subtitle">Get the complete analysis report in your preferred format</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.3} className="download-buttons">
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => onDownload("pdf")}>PDF Report</Button>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => onDownload("xlsx")}>Excel Report</Button>
            <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => onDownload("json")}>JSON Report</Button>
          </Stack>
          <Typography className="includes-title">Report Includes</Typography>
          <Stack spacing={0.8}>{includes.map((item) => <Typography className="include-item" key={item}><CheckCircleRoundedIcon /> {item}</Typography>)}</Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

function InsertRepositoryModal({ open, repositoryUrl, source, privateToken, onClose, onSave, setRepositoryUrl, setSource, setPrivateToken }: {
  open: boolean;
  repositoryUrl: string;
  source: string;
  privateToken: boolean;
  onClose: () => void;
  onSave: () => void;
  setRepositoryUrl: (value: string) => void;
  setSource: (value: string) => void;
  setPrivateToken: (value: boolean) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Insert Repository</DialogTitle>
      <DialogContent>
        <Stack spacing={2.2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <Typography className="field-label">Repository Source</Typography>
            <Select value={source} onChange={(event: SelectChangeEvent) => setSource(event.target.value)}>
              <MenuItem value="GitHub">GitHub</MenuItem>
              <MenuItem value="GitLab">GitLab</MenuItem>
              <MenuItem value="Bitbucket">Bitbucket</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Repository URL" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><LinkRoundedIcon /></InputAdornment> }} />
          <FormControlLabel control={<Checkbox checked={privateToken} onChange={(event) => setPrivateToken(event.target.checked)} />} label="Scan Private Token" />
          <Typography className="valid-message"><CheckCircleRoundedIcon /> Valid repository URL</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} startIcon={<AddRoundedIcon />}>Insert Repository</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function JavaApexDashboard() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [steps, setSteps] = useState(initialSteps);
  const [repository, setRepository] = useState<Repository>({ id: 1, source: "GitHub", url: defaultRepoUrl, privateToken: false, createdAt: "2 mins ago" });
  const [repositories, setRepositories] = useState<Repository[]>([{ id: 1, source: "GitHub", url: defaultRepoUrl, privateToken: false, createdAt: "2 mins ago" }, { id: 2, source: "GitHub", url: "https://github.com/example/legacy-java-service.git", privateToken: true, createdAt: "1 day ago" }]);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftUrl, setDraftUrl] = useState(defaultRepoUrl);
  const [draftSource, setDraftSource] = useState("GitHub");
  const [privateToken, setPrivateToken] = useState(false);

  const progress = useMemo(() => Math.round(steps.reduce((sum, step) => sum + step.progress, 0) / steps.length), [steps]);
  const chartData = useMemo(() => steps.map((step) => ({ name: step.label, value: step.progress, color: step.color })), [steps]);

  const startAnalysis = () => {
    setSteps((current) => current.map((step) => step.key === "discovery" ? { ...step, progress: 25, disabled: false, step: "Step 2 - Active" } : step));
    setActivePage("discovery");
  };

  const saveRepository = () => {
    const nextRepository = { id: Date.now(), source: draftSource, url: draftUrl, privateToken, createdAt: "Just now" };
    setRepository(nextRepository);
    setRepositories((current) => [nextRepository, ...current]);
    setModalOpen(false);
  };

  const downloadReport = (format: "pdf" | "xlsx" | "json") => {
    const content = format === "json"
      ? JSON.stringify({ application: "Java APEX Full Migration", repository: repository.url, filesScanned: 1248, javaFiles: 842, dependencies: 156, issuesFound: 12 }, null, 2)
      : `Java APEX Full Migration Report\nRepository: ${repository.url}\nFiles Scanned: 1248\nJava Files: 842\nDependencies: 156\nIssues Found: 12\nRecommendations: Upgrade to Java 21, review dependency versions, resolve detected issues.`;
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `java-apex-analysis-report.${format === "xlsx" ? "csv" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box className="dashboard-shell">
      <Sidebar activePage={activePage} setActivePage={setActivePage} steps={steps} progress={progress} />
      <Box className="main-shell" sx={{ ml: { xs: 0, lg: `${drawerWidth}px` } }}>
        <TopHeader />
        <Box component="main" className="content-area">
          <Box className="summary-grid">
            <SummaryCard title="Migration Progress" value={`${progress}%`} detail="1 of 4 steps completed" icon={DonutSmallRoundedIcon} tone="blue" progress={progress} />
            <SummaryCard title="Repositories" value={`${repositories.length}`} detail="Total connected" icon={StorageRoundedIcon} tone="blue" />
            <SummaryCard title="Analysis Status" value="Completed" detail="Last run: 2 mins ago" icon={AnalyticsRoundedIcon} tone="green" />
            <SummaryCard title="Issues Found" value="12" detail="Needs attention" icon={WarningAmberRoundedIcon} tone="red" />
          </Box>

          <Box className="main-grid">
            <RepositoryConnection repository={repository} onOpenModal={() => setModalOpen(true)} privateToken={privateToken} setPrivateToken={setPrivateToken} onAnalyze={startAnalysis} />
            <ProgressOverview chartData={chartData} progress={progress} />
          </Box>

          <AnalysisReport onDownload={downloadReport} />

          {activePage === "repositories" && (
            <Card className="dashboard-card repository-list-card"><CardContent><Typography className="card-title">Connected Repositories</Typography>{repositories.map((repo) => <Box className="repo-row" key={repo.id}><GitHubIcon /><span>{repo.url}</span><strong>{repo.source}</strong><em>{repo.createdAt}</em></Box>)}</CardContent></Card>
          )}
        </Box>
      </Box>
      <InsertRepositoryModal open={modalOpen} repositoryUrl={draftUrl} source={draftSource} privateToken={privateToken} onClose={() => setModalOpen(false)} onSave={saveRepository} setRepositoryUrl={setDraftUrl} setSource={setDraftSource} setPrivateToken={setPrivateToken} />
    </Box>
  );
}
