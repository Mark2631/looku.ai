"use client";

/* Wardrobe photos are device-resized data URLs; optimized remote image delivery is not used. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight, CalendarDays, Check, ChevronRight, CircleHelp, Cloud, Download, Heart, Layers3,
  Moon, Plus, Search, Settings, Shirt, Sparkles, Sun, Trash2, Upload, Footprints,
  BriefcaseBusiness, Watch, X, CalendarPlus, CheckCircle2, CircleAlert, ImagePlus,
  RotateCcw, Bookmark, CalendarCheck, Shirt as Clothing
} from "lucide-react";

type Screen = "today" | "closet" | "studio" | "planner" | "looks" | "preferences";
type Garment = {
  id: string; name: string; category: string; colors: string[]; formality: number;
  notes: string; status: "available" | "laundry" | "retired"; image?: string | null;
  createdAt: string; wornCount: number; sample?: boolean;
};
type Look = {
  id: string; title: string; occasion: string; style: string; reason: string;
  itemIds: string[]; createdAt: string; favorite: boolean; wornAt?: string | null;
};
type Plan = { id: string; date: string; lookId: string; title: string; notes: string };
type Preferences = { style: string; avoidedColors: string[]; notes: string };
type Workspace = { version: 1; items: Garment[]; looks: Look[]; plans: Plan[]; preferences: Preferences };

const CATEGORIES = ["Tops", "Bottoms", "Shoes", "Outerwear", "Dresses", "Accessories", "Bags", "Activewear", "Swimwear", "S¶»§q«^