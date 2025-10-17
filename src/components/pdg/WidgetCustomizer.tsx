/**
 * 🎛️ WIDGET CUSTOMIZER - 224SOLUTIONS
 * Personnalisation des widgets avec drag & drop
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Move, 
  Eye, 
  EyeOff, 
  Save, 
  RotateCcw,
  Grid3X3,
  Layout,
  Palette
} from 'lucide-react';

interface WidgetConfig {
  id: string;
  title: string;
  type: 'finance' | 'users' | 'security' | 'ai-insights' | 'alerts' | 'temporal-filters';
  enabled: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  order: number;
}

interface WidgetCustomizerProps {
  onLayoutChange: (layout: WidgetConfig[]) => void;
  initialLayout?: WidgetConfig[];
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'finance-overview',
    title: 'Aperçu Financier',
    type: 'finance',
    enabled: true,
    position: { x: 0, y: 0 },
    size: { width: 2, height: 1 },
    order: 1
  },
  {
    id: 'users-stats',
    title: 'Statistiques Utilisateurs',
    type: 'users',
    enabled: true,
    position: { x: 2, y: 0 },
    size: { width: 2, height: 1 },
    order: 2
  },
  {
    id: 'security-alerts',
    title: 'Alertes Sécurité',
    type: 'security',
    enabled: true,
    position: { x: 0, y: 1 },
    size: { width: 1, height: 1 },
    order: 3
  },
  {
    id: 'ai-insights',
    title: 'Insights IA',
    type: 'ai-insights',
    enabled: false,
    position: { x: 1, y: 1 },
    size: { width: 1, height: 1 },
    order: 4
  },
  {
    id: 'financial-alerts',
    title: 'Alertes Financières',
    type: 'alerts',
    enabled: true,
    position: { x: 2, y: 1 },
    size: { width: 2, height: 1 },
    order: 5
  },
  {
    id: 'temporal-filters',
    title: 'Filtres Temporels',
    type: 'temporal-filters',
    enabled: true,
    position: { x: 0, y: 2 },
    size: { width: 4, height: 1 },
    order: 6
  }
];

const WIDGET_COLORS = [
  { name: 'Bleu', value: 'blue', class: 'bg-blue-500' },
  { name: 'Vert', value: 'green', class: 'bg-green-500' },
  { name: 'Rouge', value: 'red', class: 'bg-red-500' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
  { name: 'Violet', value: 'purple', class: 'bg-purple-500' },
  { name: 'Gris', value: 'gray', class: 'bg-gray-500' }
];

export const WidgetCustomizer: React.FC<WidgetCustomizerProps> = ({
  onLayoutChange,
  initialLayout
}) => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialLayout || DEFAULT_WIDGETS);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();

  // Sauvegarder la configuration
  const saveLayout = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'dashboard_layout',
          value: widgets
        })
      });

      if (response.ok) {
        onLayoutChange(widgets);
        toast({
          title: "💾 Configuration sauvegardée",
          description: "Vos préférences de widgets ont été sauvegardées",
        });
      } else {
        throw new Error('Erreur sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde layout:', error);
      toast({
        title: "❌ Erreur sauvegarde",
        description: "Impossible de sauvegarder la configuration",
        variant: "destructive"
      });
    }
  };

  // Réinitialiser la configuration
  const resetLayout = () => {
    setWidgets(DEFAULT_WIDGETS);
    toast({
      title: "🔄 Configuration réinitialisée",
      description: "Retour à la configuration par défaut",
    });
  };

  // Basculer l'état d'un widget
  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, enabled: !widget.enabled }
        : widget
    ));
  };

  // Changer la couleur d'un widget
  const changeWidgetColor = (widgetId: string, color: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, color }
        : widget
    ));
  };

  // Gérer le début du drag
  const handleDragStart = (e: React.MouseEvent, widgetId: string) => {
    if (isPreviewMode) return;
    
    setIsDragging(widgetId);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Gérer le drag
  const handleDrag = (e: React.MouseEvent) => {
    if (!isDragging || isPreviewMode) return;

    const gridSize = 50; // Taille de la grille
    const x = Math.round((e.clientX - dragOffset.x) / gridSize);
    const y = Math.round((e.clientY - dragOffset.y) / gridSize);

    setWidgets(prev => prev.map(widget => 
      widget.id === isDragging 
        ? { ...widget, position: { x: Math.max(0, x), y: Math.max(0, y) } }
        : widget
    ));
  };

  // Gérer la fin du drag
  const handleDragEnd = () => {
    setIsDragging(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Appliquer les changements
  useEffect(() => {
    onLayoutChange(widgets);
  }, [widgets, onLayoutChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Personnalisation des Widgets
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Contrôles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={isPreviewMode}
                onCheckedChange={setIsPreviewMode}
              />
              <span className="text-sm">Mode aperçu</span>
            </div>
            <Badge variant={isPreviewMode ? "default" : "secondary"}>
              {isPreviewMode ? "Aperçu" : "Édition"}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={resetLayout}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
            <Button
              size="sm"
              onClick={saveLayout}
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Grille des widgets */}
        <div className="relative">
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg min-h-[400px]">
            {widgets
              .filter(widget => widget.enabled)
              .sort((a, b) => a.order - b.order)
              .map(widget => (
                <div
                  key={widget.id}
                  className={`
                    relative cursor-move rounded-lg border-2 border-dashed transition-all
                    ${isDragging === widget.id ? 'opacity-50 scale-105' : ''}
                    ${isPreviewMode ? 'cursor-default' : 'hover:border-blue-300'}
                    ${widget.color ? WIDGET_COLORS.find(c => c.value === widget.color)?.class || 'bg-blue-500' : 'bg-white'}
                  `}
                  style={{
                    gridColumn: `span ${widget.size.width}`,
                    gridRow: `span ${widget.size.height}`,
                    transform: isDragging === widget.id ? 'rotate(2deg)' : 'none'
                  }}
                  onMouseDown={(e) => handleDragStart(e, widget.id)}
                  onMouseMove={handleDrag}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{widget.title}</h4>
                      {!isPreviewMode && (
                        <div className="flex items-center gap-1">
                          <Move className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {widget.type.replace('-', ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Liste des widgets disponibles */}
        <div>
          <h4 className="font-medium mb-3">Widgets disponibles</h4>
          <div className="space-y-2">
            {widgets.map(widget => (
              <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={widget.enabled}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                  <div>
                    <div className="font-medium">{widget.title}</div>
                    <div className="text-sm text-gray-500">{widget.type}</div>
                  </div>
                </div>
                
                {widget.enabled && (
                  <div className="flex items-center gap-2">
                    {/* Sélecteur de couleur */}
                    <div className="flex gap-1">
                      {WIDGET_COLORS.map(color => (
                        <button
                          key={color.value}
                          className={`w-6 h-6 rounded-full border-2 ${
                            widget.color === color.value ? 'border-gray-800' : 'border-gray-300'
                          } ${color.class}`}
                          onClick={() => changeWidgetColor(widget.id, color.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {widgets.filter(w => w.enabled).length}
            </div>
            <div className="text-sm text-gray-600">Widgets actifs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {widgets.filter(w => w.enabled && w.color).length}
            </div>
            <div className="text-sm text-gray-600">Personnalisés</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {widgets.length}
            </div>
            <div className="text-sm text-gray-600">Total disponible</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
