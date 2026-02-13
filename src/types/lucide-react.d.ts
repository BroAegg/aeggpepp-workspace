declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'

  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    strokeWidth?: number | string
    absoluteStrokeWidth?: boolean
  }

  export type Icon = FC<IconProps>

  // Layout & Navigation
  export const Home: Icon
  export const Menu: Icon
  export const X: Icon
  export const ChevronLeft: Icon
  export const ChevronRight: Icon
  export const ChevronDown: Icon
  export const ChevronUp: Icon
  export const ArrowRight: Icon
  export const ArrowLeft: Icon
  export const LayoutGrid: Icon
  export const PanelLeftClose: Icon
  export const PanelLeft: Icon
  export const SidebarClose: Icon
  export const Sidebar: Icon

  // Actions
  export const Search: Icon
  export const Plus: Icon
  export const Trash2: Icon
  export const Edit: Icon
  export const MoreHorizontal: Icon
  export const MoreVertical: Icon
  export const ExternalLink: Icon
  export const Copy: Icon
  export const Share2: Icon
  export const Download: Icon
  export const Upload: Icon
  export const Filter: Icon
  export const SortAsc: Icon
  export const SortDesc: Icon

  // Status & Feedback
  export const Bell: Icon
  export const AlertCircle: Icon
  export const CheckCircle: Icon
  export const CheckCircle2: Icon
  export const Circle: Icon
  export const Info: Icon
  export const AlertTriangle: Icon
  export const Check: Icon
  export const XCircle: Icon
  export const CheckSquare: Icon
  export const SquareCheck: Icon

  // Content & Media
  export const Calendar: Icon
  export const Clock: Icon
  export const Image: Icon
  export const FileText: Icon
  export const File: Icon
  export const Video: Icon
  export const Camera: Icon
  export const MapPin: Icon
  export const Link2: Icon
  export const Bookmark: Icon

  // Feature Icons
  export const Target: Icon
  export const Wallet: Icon
  export const CreditCard: Icon
  export const Heart: Icon
  export const Settings: Icon
  export const Briefcase: Icon
  export const Gift: Icon
  export const Star: Icon
  export const Zap: Icon
  export const TrendingUp: Icon
  export const TrendingDown: Icon
  export const BarChart3: Icon
  export const PieChart: Icon
  export const DollarSign: Icon
  export const Tag: Icon
  export const Hash: Icon

  // User & Auth
  export const LogIn: Icon
  export const LogOut: Icon
  export const Mail: Icon
  export const Lock: Icon
  export const UserPlus: Icon
  export const User: Icon
  export const Users: Icon
  export const Eye: Icon
  export const EyeOff: Icon

  // Theme
  export const Sun: Icon
  export const Moon: Icon
  export const Monitor: Icon
  export const Palette: Icon

  // Misc
  export const Inbox: Icon
  export const Archive: Icon
  export const Trash: Icon
  export const RefreshCw: Icon
  export const Loader2: Icon
  export const Github: Icon
  export const Globe: Icon
  export const Sparkles: Icon
  export const MessageSquare: Icon
  export const Send: Icon
  export const Paperclip: Icon
  export const FolderOpen: Icon
  export const Folder: Icon
  export const GripVertical: Icon
  export const CalendarDays: Icon
  export const CircleDot: Icon

  // Finance & Shopping
  export const PiggyBank: Icon
  export const ShoppingCart: Icon
  export const Coffee: Icon
  export const Car: Icon
  export const Gamepad2: Icon
  export const Receipt: Icon
  export const Edit2: Icon
  export const ArrowUpRight: Icon
  export const ArrowDownRight: Icon

  // Gallery
  export const Grid: Icon
  export const LayoutList: Icon

  // Portfolio & Social
  export const Link: Icon
  export const Linkedin: Icon
  export const Twitter: Icon
  export const Code: Icon
}
