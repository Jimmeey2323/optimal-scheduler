import { ClassData, AIRecommendation, AIProvider, ScheduledClass, OptimizationSuggestion } from '../types';
import { generateIntelligentSchedule } from './classUtils';

export class AIService {
  private provider: AIProvider | null = null;

  constructor() {
    // Don't set a default provider with potentially invalid key
    this.provider = null;
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  async generateRecommendations(
    historicData: ClassData[],
    day: string,
    time: string,
    location: string
  ): Promise<AIRecommendation[]> {
    // Always return fallback recommendations if no provider is configured or key is missing
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('AI provider not configured or missing API key, using fallback recommendations');
      return this.getFallbackRecommendations(historicData, location, day, time);
    }

    const relevantData = historicData.filter(
      item => item.location === location && 
      item.dayOfWeek === day && 
      item.classTime.includes(time.slice(0, 5))
    );

    if (relevantData.length === 0) {
      return this.getFallbackRecommendations(historicData, location, day, time);
    }

    const prompt = this.buildAdvancedRecommendationPrompt(relevantData, day, time, location, historicData);
    
    try {
      const response = await this.callAI(prompt);
      const recommendations = this.parseAIResponse(response);
      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.warn('AI service error, falling back to local recommendations:', error);
      return this.getFallbackRecommendations(historicData, location, day, time);
    }
  }

  async generateOptimizedSchedule(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    customTeachers: any[] = [],
    options: any = {}
  ): Promise<ScheduledClass[]> {
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('AI provider not configured, using intelligent local optimization');
      return this.generateIntelligentLocalSchedule(historicData, currentSchedule, customTeachers, options);
    }

    const prompt = this.buildAdvancedOptimizationPrompt(historicData, currentSchedule, customTeachers, options);
    
    try {
      const response = await this.callAI(prompt);
      const optimizedSchedule = this.parseOptimizedScheduleResponse(response, historicData);
      return optimizedSchedule;
    } catch (error) {
      console.warn('AI optimization error, falling back to intelligent local optimization:', error);
      return this.generateIntelligentLocalSchedule(historicData, currentSchedule, customTeachers, options);
    }
  }

  private buildAdvancedRecommendationPrompt(
    data: ClassData[], 
    day: string, 
    time: string, 
    location: string,
    allData: ClassData[]
  ): string {
    const classPerformance = this.analyzeClassPerformance(data);
    const teacherPerformance = this.analyzeTeacherPerformance(data);
    const timeSlotAnalysis = this.analyzeTimeSlotPerformance(allData, location, day, time);
    const competitorAnalysis = this.analyzeCompetitorSlots(allData, location, day, time);

    return `
      You are an expert fitness studio scheduling AI. Analyze this data for ${location} on ${day} at ${time} and provide intelligent class recommendations.

      CRITICAL SCHEDULING RULES:
      1. NO classes between 12:30 PM - 5:00 PM except Sundays (4:00 PM earliest) and Saturdays (4:00 PM earliest)
      2. Supreme HQ Bandra: PowerCycle ONLY, NO Amped Up/HIIT
      3. Other locations: NO PowerCycle classes
      4. Max 15 hours/week per teacher, max 4 hours/day per teacher
      5. Each teacher needs minimum 2 days off per week
      6. Minimize trainers per shift while maintaining quality
      7. Balance morning (before 2 PM) and evening (after 3 PM) classes
      8. Multiple classes in same slot must have above-average attendance
      9. Avoid same class format in same time slot
      10. Prioritize top performers (avg > 6 participants)

      HISTORIC PERFORMANCE DATA:
      ${classPerformance.map(p => `- ${p.classFormat}: ${p.avgParticipants.toFixed(1)} avg participants, ₹${p.avgRevenue.toFixed(0)} revenue, ${p.frequency} classes held`).join('\n')}
      
      TEACHER PERFORMANCE:
      ${teacherPerformance.map(p => `- ${p.teacher}: ${p.avgParticipants.toFixed(1)} avg participants, ${p.classesCount} classes taught`).join('\n')}
      
      TIME SLOT ANALYSIS:
      - Peak attendance: ${timeSlotAnalysis.peakAttendance} participants
      - Average revenue: ₹${timeSlotAnalysis.avgRevenue.toFixed(0)}
      - Success rate: ${(timeSlotAnalysis.successRate * 100).toFixed(1)}%
      - Best performing format: ${timeSlotAnalysis.bestFormat}
      
      COMPETITIVE ANALYSIS:
      - Similar time slots performance: ${competitorAnalysis.similarSlotsAvg.toFixed(1)} avg participants
      - Market opportunity score: ${competitorAnalysis.opportunityScore}/10

      Provide 5 data-driven recommendations in JSON format:
      {
        "recommendations": [
          {
            "classFormat": "specific class name from data",
            "teacher": "best teacher name from performance data", 
            "reasoning": "detailed data-driven explanation with specific metrics",
            "confidence": 0.85,
            "expectedParticipants": 12,
            "expectedRevenue": 8000,
            "priority": 9,
            "timeSlot": "${time}",
            "location": "${location}",
            "riskFactors": ["potential issues"],
            "successProbability": 0.92
          }
        ]
      }
      
      Focus on:
      - Highest ROI combinations based on historic data
      - Teacher-class format synergy from past performance
      - Time slot optimization for maximum attendance
      - Revenue maximization strategies
      - Risk mitigation based on failure patterns
      - Market positioning against competitor time slots
    `;
  }

  private buildAdvancedOptimizationPrompt(
    historicData: ClassData[], 
    currentSchedule: ScheduledClass[],
    customTeachers: any[],
    options: any
  ): string {
    const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
    const locationAnalysis = this.analyzeLocationPerformance(historicData);
    const teacherUtilization = this.analyzeTeacherUtilization(currentSchedule);
    
    return `
      You are an expert AI fitness studio scheduler. Create an optimized weekly schedule following these STRICT rules:
      
      MANDATORY CONSTRAINTS:
      1. Time Restrictions:
         - NO classes 12:30 PM - 5:00 PM (except Sundays: 4:00 PM earliest, Saturdays: 4:00 PM earliest)
         - Balance morning (6 AM - 2 PM) and evening (3 PM - 9 PM) classes equally
      
      2. Location Rules:
         - Supreme HQ Bandra: PowerCycle classes ONLY, max 3 parallel classes
         - Other locations: NO PowerCycle, max 2 parallel classes
         - NO Amped Up/HIIT at Supreme HQ Bandra
      
      3. Teacher Constraints:
         - Max 15 hours/week per teacher
         - Max 4 hours/day per teacher
         - Minimum 2 days off per week per teacher
         - Priority teachers (${priorityTeachers.join(', ')}) should get 12-15 hours
         - Minimize trainers per shift (prefer 2-3 trainers covering 4-6 classes)
      
      4. Quality Standards:
         - Multiple classes in same slot must have above-average historic attendance
         - No duplicate class formats in same time slot
         - Prioritize class-teacher combinations with proven success (>6 avg participants)
         - New teachers only for: Barre 57, Foundations, Recovery, Power Cycle
      
      CURRENT SCHEDULE ANALYSIS:
      ${currentSchedule.map(cls => `${cls.day} ${cls.time} - ${cls.classFormat} with ${cls.teacherFirstName} ${cls.teacherLastName} at ${cls.location} (${cls.participants || 0} expected)`).join('\n')}
      
      LOCATION PERFORMANCE DATA:
      ${Object.entries(locationAnalysis).map(([loc, data]: [string, any]) => 
        `${loc}: ${data.avgParticipants.toFixed(1)} avg participants, ${data.totalClasses} classes, ₹${data.avgRevenue.toFixed(0)} avg revenue`
      ).join('\n')}
      
      TEACHER UTILIZATION:
      ${Object.entries(teacherUtilization).map(([teacher, hours]: [string, any]) => 
        `${teacher}: ${hours.toFixed(1)}h/week (${((hours/15)*100).toFixed(0)}% utilization)`
      ).join('\n')}

      Generate a complete optimized schedule in JSON format:
      {
        "optimizedSchedule": [
          {
            "day": "Monday",
            "time": "07:00",
            "location": "Supreme HQ, Bandra",
            "classFormat": "PowerCycle",
            "teacherFirstName": "Anisha",
            "teacherLastName": "",
            "duration": "1",
            "expectedParticipants": 12,
            "expectedRevenue": 8500,
            "priority": 9,
            "reasoning": "data-driven explanation",
            "isTopPerformer": true
          }
        ],
        "optimizationMetrics": {
          "totalClasses": 85,
          "avgUtilization": 0.87,
          "revenueProjection": 750000,
          "teacherSatisfaction": 0.94,
          "scheduleEfficiency": 0.91
        },
        "improvements": [
          "specific improvements made with metrics"
        ]
      }
      
      OPTIMIZATION GOALS (Priority Order):
      1. Maximize revenue per hour across all locations
      2. Achieve 85%+ teacher utilization (12-15h for priority teachers)
      3. Maintain 90%+ class fill rates based on historic data
      4. Minimize operational complexity (fewer trainers per shift)
      5. Ensure teacher work-life balance (2+ days off)
      6. Create diverse class offerings throughout the week
      7. Optimize for peak time slots with best teachers
      
      Use iteration ${options.iteration || 0} to create unique variations while maintaining quality.
    `;
  }

  private analyzeTimeSlotPerformance(data: ClassData[], location: string, day: string, time: string) {
    const slotData = data.filter(item => 
      item.location === location && 
      item.dayOfWeek === day && 
      item.classTime.includes(time.slice(0, 5))
    );

    if (slotData.length === 0) {
      return { peakAttendance: 0, avgRevenue: 0, successRate: 0, bestFormat: 'N/A' };
    }

    const peakAttendance = Math.max(...slotData.map(item => item.participants));
    const avgRevenue = slotData.reduce((sum, item) => sum + item.totalRevenue, 0) / slotData.length;
    const avgParticipants = slotData.reduce((sum, item) => sum + item.participants, 0) / slotData.length;
    const successRate = slotData.filter(item => item.participants > avgParticipants).length / slotData.length;
    
    const formatStats = slotData.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) acc[item.cleanedClass] = 0;
      acc[item.cleanedClass] += item.participants;
      return acc;
    }, {} as any);
    
    const bestFormat = Object.entries(formatStats).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { peakAttendance, avgRevenue, successRate, bestFormat };
  }

  private analyzeCompetitorSlots(data: ClassData[], location: string, day: string, time: string) {
    const hour = parseInt(time.split(':')[0]);
    const similarSlots = data.filter(item => {
      const itemHour = parseInt(item.classTime.split(':')[0]);
      return item.location === location && 
             item.dayOfWeek === day && 
             Math.abs(itemHour - hour) <= 1; // Within 1 hour
    });

    const similarSlotsAvg = similarSlots.length > 0 
      ? similarSlots.reduce((sum, item) => sum + item.participants, 0) / similarSlots.length 
      : 0;

    // Calculate opportunity score based on performance gaps
    const opportunityScore = Math.min(10, Math.max(1, 
      (similarSlotsAvg > 8 ? 9 : similarSlotsAvg > 5 ? 7 : 5) + 
      (similarSlots.length > 10 ? 1 : 0)
    ));

    return { similarSlotsAvg, opportunityScore };
  }

  private analyzeLocationPerformance(data: ClassData[]) {
    const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
    
    return locations.reduce((acc, location) => {
      const locationData = data.filter(item => item.location === location);
      if (locationData.length === 0) {
        acc[location] = { avgParticipants: 0, totalClasses: 0, avgRevenue: 0 };
        return acc;
      }

      acc[location] = {
        avgParticipants: locationData.reduce((sum, item) => sum + item.participants, 0) / locationData.length,
        totalClasses: locationData.length,
        avgRevenue: locationData.reduce((sum, item) => sum + item.totalRevenue, 0) / locationData.length
      };
      return acc;
    }, {} as any);
  }

  private analyzeTeacherUtilization(schedule: ScheduledClass[]) {
    return schedule.reduce((acc, cls) => {
      const teacher = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      acc[teacher] = (acc[teacher] || 0) + parseFloat(cls.duration);
      return acc;
    }, {} as any);
  }

  private generateIntelligentLocalSchedule(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    customTeachers: any[],
    options: any
): ScheduledClass[] {
    // Use the enhanced generateIntelligentSchedule function from classUtils
    return generateIntelligentSchedule(historicData, customTeachers, {
      prioritizeTopPerformers: true,
      balanceShifts: true,
      optimizeTeacherHours: true,
      respectTimeRestrictions: true,
      minimizeTrainersPerShift: true,
      iteration: options.iteration || 0
    });
  }

  private parseOptimizedScheduleResponse(response: string, historicData: ClassData[]): ScheduledClass[] {
    try {
      const parsed = JSON.parse(response);
      const schedule = parsed.optimizedSchedule || [];
      
      return schedule.map((cls: any, index: number) => ({
        id: `ai-optimized-${Date.now()}-${index}`,
        day: cls.day,
        time: cls.time,
        location: cls.location,
        classFormat: cls.classFormat,
        teacherFirstName: cls.teacherFirstName,
        teacherLastName: cls.teacherLastName,
        duration: cls.duration || '1',
        participants: cls.expectedParticipants,
        revenue: cls.expectedRevenue,
        isTopPerformer: cls.isTopPerformer || cls.priority >= 8
      }));
    } catch (error) {
      console.error('Failed to parse optimized schedule response:', error);
      return this.generateIntelligentLocalSchedule(historicData, [], [], {});
    }
  }

  async optimizeSchedule(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    teacherAvailability: any = {}
  ): Promise<OptimizationSuggestion[]> {
    // Always return fallback optimizations if no provider is configured or key is missing
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('AI provider not configured or missing API key, using fallback optimizations');
      return this.getFallbackOptimizations(historicData, currentSchedule);
    }

    const prompt = this.buildOptimizationPrompt(historicData, currentSchedule, teacherAvailability);
    
    try {
      const response = await this.callAI(prompt);
      const suggestions = this.parseOptimizationResponse(response);
      return suggestions.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.warn('AI optimization error, falling back to local optimizations:', error);
      return this.getFallbackOptimizations(historicData, currentSchedule);
    }
  }

  private buildOptimizationPrompt(
    historicData: ClassData[], 
    currentSchedule: ScheduledClass[],
    teacherAvailability: any
  ): string {
    const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
    
    return `
      Optimize this fitness studio schedule following these strict rules:
      
      Current Schedule:
      ${currentSchedule.map(cls => `${cls.day} ${cls.time} - ${cls.classFormat} with ${cls.teacherFirstName} ${cls.teacherLastName} at ${cls.location}`).join('\n')}
      
      OPTIMIZATION RULES:
      1. Max 15 classes per teacher per week (prioritize Anisha, Mrigakshi, Vivaran for overages)
      2. Minimize trainers per shift per location (prefer 2 trainers for 4-5 classes)
      3. Assign experienced teachers to formats they've succeeded with
      4. Give all teachers 2 days off per week
      5. New teachers only for: Barre 57, Foundations, Recovery, Power Cycle
      6. Prioritize max hours for: ${priorityTeachers.join(', ')}
      7. Don't change successful historic combinations
      8. No overlapping classes for same teacher
      9. Fair mix of class levels horizontally and vertically
      10. Max 3-4 hours per teacher per day
      
      Provide optimization suggestions in JSON format:
      {
        "suggestions": [
          {
            "type": "teacher_change",
            "originalClass": {...},
            "suggestedClass": {...},
            "reason": "explanation",
            "impact": "expected improvement",
            "priority": 8
          }
        ]
      }
    `;
  }

  private analyzeClassPerformance(data: ClassData[]) {
    const classStats = data.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) {
        acc[item.cleanedClass] = { participants: 0, revenue: 0, count: 0 };
      }
      acc[item.cleanedClass].participants += item.participants;
      acc[item.cleanedClass].revenue += item.totalRevenue;
      acc[item.cleanedClass].count += 1;
      return acc;
    }, {} as any);

    return Object.entries(classStats)
      .map(([classFormat, stats]: [string, any]) => ({
        classFormat,
        avgParticipants: stats.participants / stats.count,
        avgRevenue: stats.revenue / stats.count,
        frequency: stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants);
  }

  private analyzeTeacherPerformance(data: ClassData[]) {
    const teacherStats = data.reduce((acc, item) => {
      if (!acc[item.teacherName]) {
        acc[item.teacherName] = { participants: 0, count: 0 };
      }
      acc[item.teacherName].participants += item.participants;
      acc[item.teacherName].count += 1;
      return acc;
    }, {} as any);

    return Object.entries(teacherStats)
      .map(([teacher, stats]: [string, any]) => ({
        teacher,
        avgParticipants: stats.participants / stats.count,
        classesCount: stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants);
  }

  private async callAI(prompt: string): Promise<string> {
    if (!this.provider) throw new Error('No AI provider configured');
    if (!this.provider.key || this.provider.key.trim() === '') {
      throw new Error('No API key provided');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.provider.key}`
    };

    let body: any;
    let url = this.provider.endpoint;

    switch (this.provider.name) {
      case 'OpenAI':
        body = {
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 3000
        };
        break;
      
      case 'Anthropic':
        headers['anthropic-version'] = '2023-06-01';
        body = {
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 3000
        };
        break;
      
      case 'DeepSeek':
        body = {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 3000
        };
        break;
      
      case 'Groq':
        body = {
          model: 'mixtral-8x7b-32768',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 3000
        };
        break;
      
      default:
        throw new Error('Unsupported AI provider');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      
      if (this.provider.name === 'Anthropic') {
        return data.content?.[0]?.text || '';
      } else {
        return data.choices?.[0]?.message?.content || '';
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to AI service. Please check your internet connection.');
      }
      throw error;
    }
  }

  private parseAIResponse(response: string): AIRecommendation[] {
    try {
      const parsed = JSON.parse(response);
      return (parsed.recommendations || []).map((rec: any) => ({
        ...rec,
        priority: rec.priority || 5
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  private parseOptimizationResponse(response: string): OptimizationSuggestion[] {
    try {
      const parsed = JSON.parse(response);
      return (parsed.suggestions || []).map((sug: any) => ({
        ...sug,
        priority: sug.priority || 5
      }));
    } catch (error) {
      console.error('Failed to parse optimization response:', error);
      return [];
    }
  }

  private getFallbackRecommendations(
    data: ClassData[], 
    location: string, 
    day: string, 
    time: string
): AIRecommendation[] {
    const locationData = data.filter(item => item.location === location);
    const classStats = this.analyzeClassPerformance(locationData);

    // If no location data, use all data
    const analysisData = locationData.length > 0 ? locationData : data;
    const finalStats = locationData.length > 0 ? classStats : this.analyzeClassPerformance(data);

    return finalStats.slice(0, 5).map((stats, index) => ({
      classFormat: stats.classFormat,
      teacher: 'Best Available',
      reasoning: `High-performing class with ${stats.avgParticipants.toFixed(1)} average participants (based on historical data)`,
      confidence: Math.min(0.9, stats.frequency / 10),
      expectedParticipants: Math.round(stats.avgParticipants),
      expectedRevenue: Math.round(stats.avgRevenue),
      priority: 10 - index * 2
    }));
  }

  private getFallbackOptimizations(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[]
  ): OptimizationSuggestion[] {
    // Basic optimization logic as fallback
    const suggestions: OptimizationSuggestion[] = [];
    
    // Find teachers with too many hours
    const teacherHours: Record<string, number> = {};
    currentSchedule.forEach(cls => {
      const teacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      teacherHours[teacherName] = (teacherHours[teacherName] || 0) + parseFloat(cls.duration || '1');
    });

    // Suggest redistributing hours for overloaded teachers
    Object.entries(teacherHours).forEach(([teacher, hours]) => {
      if (hours > 15) {
        const overloadedClasses = currentSchedule.filter(cls => 
          `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher
        );
        
        if (overloadedClasses.length > 0) {
          suggestions.push({
            type: 'teacher_change',
            originalClass: overloadedClasses[0],
            suggestedClass: {
              ...overloadedClasses[0],
              teacherFirstName: 'Alternative',
              teacherLastName: 'Teacher'
            },
            reason: `${teacher} is overloaded with ${hours} hours. Consider redistributing classes.`,
            impact: 'Better work-life balance and reduced teacher fatigue',
            priority: 7
          });
        }
      }
    });

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
}

export const aiService = new AIService();