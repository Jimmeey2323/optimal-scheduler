import { ClassData, ScheduledClass, CustomTeacher } from '../types';

export interface OptimizationIteration {
  id: string;
  name: string;
  description: string;
  schedule: ScheduledClass[];
  metrics: {
    totalRevenue: number;
    totalAttendance: number;
    teacherUtilization: number;
    fillRate: number;
    efficiency: number;
  };
  trainerAssignments: Record<string, {
    hours: number;
    shifts: string[];
    locations: string[];
    consecutiveClasses: number;
  }>;
}

export interface LocationCapacity {
  [location: string]: {
    [studio: string]: number;
  };
}

export const LOCATION_CAPACITIES: LocationCapacity = {
  'Supreme HQ, Bandra': {
    'Main Studio': 14,
    'Cycle Studio': 14
  },
  'Kwality House, Kemps Corner': {
    'Studio 1': 20,
    'Studio 2': 12,
    'Mat Studio': 13,
    'Fit Studio': 14
  },
  'Kenkere House': {
    'Main Studio': 12,
    'Secondary Studio': 10
  }
};

export const DAY_GUIDELINES = {
  'Monday': {
    focus: 'Strong start with high-demand formats & senior trainers',
    avoid: ['Studio Recovery'],
    priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57'],
    maxClasses: 12
  },
  'Tuesday': {
    focus: 'Balance beginner & intermediate classes',
    avoid: ['Studio HIIT', 'Studio Amped Up!'],
    priority: ['Studio Barre 57', 'Studio Mat 57', 'Studio Foundations', 'Studio Cardio Barre'],
    maxClasses: 12
  },
  'Wednesday': {
    focus: 'Midweek peak - repeat Monday\'s popular formats',
    avoid: [],
    priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57'],
    maxClasses: 12
  },
  'Thursday': {
    focus: 'Lighter mix with recovery formats',
    avoid: [],
    priority: ['Studio Recovery', 'Studio Mat 57', 'Studio Cardio Barre', 'Studio Back Body Blaze'],
    maxClasses: 10
  },
  'Friday': {
    focus: 'Energy-focused with HIIT/Advanced classes',
    avoid: [],
    priority: ['Studio HIIT', 'Studio Amped Up!', 'Studio FIT', 'Studio Cardio Barre'],
    maxClasses: 12
  },
  'Saturday': {
    focus: 'Family-friendly & community formats',
    avoid: ['Studio HIIT'],
    priority: ['Studio Barre 57', 'Studio Foundations', 'Studio Recovery', 'Studio Mat 57'],
    maxClasses: 10
  },
  'Sunday': {
    focus: 'Max 4-5 classes, highest scoring formats only',
    avoid: ['Studio HIIT', 'Studio Amped Up!'],
    priority: ['Studio Barre 57', 'Studio Recovery', 'Studio Mat 57'],
    maxClasses: 5
  }
};

export const PEAK_HOURS = {
  morning: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
  evening: ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00']
};

export const SENIOR_TRAINERS = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
export const NEW_TRAINERS = ['Kabir', 'Simonelle'];
export const ADVANCED_FORMATS = ['Studio HIIT', 'Studio Amped Up!'];

export class EnhancedOptimizer {
  private csvData: ClassData[];
  private customTeachers: CustomTeacher[];
  private locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  private days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(csvData: ClassData[], customTeachers: CustomTeacher[] = []) {
    this.csvData = csvData;
    this.customTeachers = customTeachers;
  }

  generateOptimizedSchedules(): OptimizationIteration[] {
    const iterations: OptimizationIteration[] = [];

    // Generate 3 different optimization approaches
    iterations.push(this.generateRevenueMaximizer());
    iterations.push(this.generateAttendanceMaximizer());
    iterations.push(this.generateBalancedSchedule());

    return iterations;
  }

  private generateRevenueMaximizer(): OptimizationIteration {
    const schedule: ScheduledClass[] = [];
    const trainerTracking = this.initializeTrainerTracking();

    // Focus on high-revenue classes and peak hours
    for (const location of this.locations) {
      for (const day of this.days) {
        const guidelines = DAY_GUIDELINES[day];
        const timeSlots = this.generateFlexibleTimeSlots(day, location);
        
        let classesScheduled = 0;
        const maxClasses = guidelines.maxClasses;

        for (const time of timeSlots) {
          if (classesScheduled >= maxClasses) break;

          const isPeak = this.isPeakHour(time);
          const maxParallel = this.getMaxParallelClasses(location);
          
          // Schedule high-revenue classes in peak hours
          const classesToSchedule = isPeak ? maxParallel : Math.min(2, maxParallel);
          
          for (let i = 0; i < classesToSchedule && classesScheduled < maxClasses; i++) {
            const bestClass = this.findBestRevenueClass(location, day, time, schedule, guidelines);
            
            if (bestClass) {
              const teacher = this.assignOptimalTeacher(bestClass, day, time, trainerTracking, schedule);
              
              if (teacher && this.validateTrainerAssignment(teacher, day, time, location, trainerTracking, schedule)) {
                const scheduledClass = this.createScheduledClass(bestClass, teacher, day, time, location);
                schedule.push(scheduledClass);
                this.updateTrainerTracking(teacher, day, time, location, trainerTracking, parseFloat(scheduledClass.duration));
                classesScheduled++;
              }
            }
          }
        }
      }
    }

    return {
      id: 'revenue-maximizer',
      name: 'Revenue Maximizer',
      description: 'Optimized for maximum revenue generation with premium classes in peak hours',
      schedule,
      metrics: this.calculateMetrics(schedule),
      trainerAssignments: this.getTrainerAssignments(schedule)
    };
  }

  private generateAttendanceMaximizer(): OptimizationIteration {
    const schedule: ScheduledClass[] = [];
    const trainerTracking = this.initializeTrainerTracking();

    // Focus on high-attendance classes and popular formats
    for (const location of this.locations) {
      for (const day of this.days) {
        const guidelines = DAY_GUIDELINES[day];
        const timeSlots = this.generateFlexibleTimeSlots(day, location);
        
        let classesScheduled = 0;
        const maxClasses = guidelines.maxClasses;

        for (const time of timeSlots) {
          if (classesScheduled >= maxClasses) break;

          const maxParallel = this.getMaxParallelClasses(location);
          const classesToSchedule = Math.min(maxParallel, maxClasses - classesScheduled);
          
          for (let i = 0; i < classesToSchedule; i++) {
            const bestClass = this.findBestAttendanceClass(location, day, time, schedule, guidelines);
            
            if (bestClass) {
              const teacher = this.assignOptimalTeacher(bestClass, day, time, trainerTracking, schedule);
              
              if (teacher && this.validateTrainerAssignment(teacher, day, time, location, trainerTracking, schedule)) {
                const scheduledClass = this.createScheduledClass(bestClass, teacher, day, time, location);
                schedule.push(scheduledClass);
                this.updateTrainerTracking(teacher, day, time, location, trainerTracking, parseFloat(scheduledClass.duration));
                classesScheduled++;
              }
            }
          }
        }
      }
    }

    return {
      id: 'attendance-maximizer',
      name: 'Attendance Maximizer',
      description: 'Optimized for maximum footfall and studio utilization',
      schedule,
      metrics: this.calculateMetrics(schedule),
      trainerAssignments: this.getTrainerAssignments(schedule)
    };
  }

  private generateBalancedSchedule(): OptimizationIteration {
    const schedule: ScheduledClass[] = [];
    const trainerTracking = this.initializeTrainerTracking();

    // Balance revenue, attendance, and trainer satisfaction
    for (const location of this.locations) {
      for (const day of this.days) {
        const guidelines = DAY_GUIDELINES[day];
        const timeSlots = this.generateFlexibleTimeSlots(day, location);
        
        let classesScheduled = 0;
        const maxClasses = guidelines.maxClasses;

        // Ensure 7:30 AM start for Kwality House on weekdays
        if (location === 'Kwality House, Kemps Corner' && !['Saturday', 'Sunday'].includes(day)) {
          const earlyClass = this.findBestBalancedClass(location, day, '07:30', schedule, guidelines);
          if (earlyClass) {
            const teacher = this.assignOptimalTeacher(earlyClass, day, '07:30', trainerTracking, schedule);
            if (teacher) {
              const scheduledClass = this.createScheduledClass(earlyClass, teacher, day, '07:30', location);
              schedule.push(scheduledClass);
              this.updateTrainerTracking(teacher, day, '07:30', location, trainerTracking, parseFloat(scheduledClass.duration));
              classesScheduled++;
            }
          }
        }

        for (const time of timeSlots) {
          if (classesScheduled >= maxClasses) break;
          if (time === '07:30' && location === 'Kwality House, Kemps Corner' && !['Saturday', 'Sunday'].includes(day)) continue;

          const maxParallel = this.getMaxParallelClasses(location);
          const trainersInShift = this.getTrainersInShift(schedule, location, day, time);
          const maxTrainersPerShift = day === 'Sunday' ? 1 : 3;
          
          if (trainersInShift.length >= maxTrainersPerShift) continue;

          const classesToSchedule = Math.min(maxParallel, maxClasses - classesScheduled);
          
          for (let i = 0; i < classesToSchedule; i++) {
            const bestClass = this.findBestBalancedClass(location, day, time, schedule, guidelines);
            
            if (bestClass) {
              const teacher = this.assignOptimalTeacher(bestClass, day, time, trainerTracking, schedule);
              
              if (teacher && this.validateTrainerAssignment(teacher, day, time, location, trainerTracking, schedule)) {
                const scheduledClass = this.createScheduledClass(bestClass, teacher, day, time, location);
                schedule.push(scheduledClass);
                this.updateTrainerTracking(teacher, day, time, location, trainerTracking, parseFloat(scheduledClass.duration));
                classesScheduled++;
              }
            }
          }
        }
      }
    }

    return {
      id: 'balanced-schedule',
      name: 'Balanced Schedule',
      description: 'Balanced approach optimizing revenue, attendance, and trainer workload',
      schedule,
      metrics: this.calculateMetrics(schedule),
      trainerAssignments: this.getTrainerAssignments(schedule)
    };
  }

  private generateFlexibleTimeSlots(day: string, location: string): string[] {
    const baseSlots = [
      '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
    ];

    // Add flexible timing options
    const flexibleSlots = [
      '07:15', '07:45', '08:15', '08:45', '09:15', '09:45', '10:15', '10:45', '11:15', '11:45',
      '17:15', '17:45', '18:15', '18:45', '19:15', '19:45'
    ];

    // Combine and sort
    const allSlots = [...baseSlots, ...flexibleSlots].sort();

    // Filter based on location and day preferences
    return allSlots.filter(time => {
      // Ensure 7:30 AM is always first for Kwality House weekdays
      if (location === 'Kwality House, Kemps Corner' && !['Saturday', 'Sunday'].includes(day)) {
        return true; // Allow all slots
      }
      return true;
    });
  }

  private findBestRevenueClass(
    location: string, 
    day: string, 
    time: string, 
    existingSchedule: ScheduledClass[], 
    guidelines: any
  ): any {
    const relevantData = this.csvData.filter(item => 
      item.location === location &&
      item.dayOfWeek === day &&
      item.participants > 5.0 && // Average > 5.0 criteria
      !guidelines.avoid.includes(item.cleanedClass) &&
      this.isClassAllowedAtLocation(item.cleanedClass, location)
    );

    if (relevantData.length === 0) return null;

    // Group by class format and calculate revenue metrics
    const classStats = this.groupClassesByFormat(relevantData);
    
    // Filter out formats already scheduled at this time slot
    const existingFormats = existingSchedule
      .filter(cls => cls.location === location && cls.day === day && cls.time === time)
      .map(cls => cls.classFormat);

    const availableClasses = Object.entries(classStats)
      .filter(([format]) => !existingFormats.includes(format))
      .map(([format, stats]: [string, any]) => ({
        classFormat: format,
        avgRevenue: stats.revenue / stats.count,
        avgParticipants: stats.participants / stats.count,
        count: stats.count,
        isPriority: guidelines.priority.includes(format)
      }))
      .sort((a, b) => {
        // Prioritize by revenue, then by priority status
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return b.avgRevenue - a.avgRevenue;
      });

    return availableClasses[0] || null;
  }

  private findBestAttendanceClass(
    location: string, 
    day: string, 
    time: string, 
    existingSchedule: ScheduledClass[], 
    guidelines: any
  ): any {
    const relevantData = this.csvData.filter(item => 
      item.location === location &&
      item.dayOfWeek === day &&
      item.participants > 5.0 &&
      !guidelines.avoid.includes(item.cleanedClass) &&
      this.isClassAllowedAtLocation(item.cleanedClass, location)
    );

    if (relevantData.length === 0) return null;

    const classStats = this.groupClassesByFormat(relevantData);
    
    const existingFormats = existingSchedule
      .filter(cls => cls.location === location && cls.day === day && cls.time === time)
      .map(cls => cls.classFormat);

    const availableClasses = Object.entries(classStats)
      .filter(([format]) => !existingFormats.includes(format))
      .map(([format, stats]: [string, any]) => ({
        classFormat: format,
        avgRevenue: stats.revenue / stats.count,
        avgParticipants: stats.participants / stats.count,
        count: stats.count,
        isPriority: guidelines.priority.includes(format)
      }))
      .sort((a, b) => {
        // Prioritize by attendance, then by priority status
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return b.avgParticipants - a.avgParticipants;
      });

    return availableClasses[0] || null;
  }

  private findBestBalancedClass(
    location: string, 
    day: string, 
    time: string, 
    existingSchedule: ScheduledClass[], 
    guidelines: any
  ): any {
    const relevantData = this.csvData.filter(item => 
      item.location === location &&
      item.dayOfWeek === day &&
      item.participants > 5.0 &&
      !guidelines.avoid.includes(item.cleanedClass) &&
      this.isClassAllowedAtLocation(item.cleanedClass, location)
    );

    if (relevantData.length === 0) return null;

    const classStats = this.groupClassesByFormat(relevantData);
    
    const existingFormats = existingSchedule
      .filter(cls => cls.location === location && cls.day === day && cls.time === time)
      .map(cls => cls.classFormat);

    const availableClasses = Object.entries(classStats)
      .filter(([format]) => !existingFormats.includes(format))
      .map(([format, stats]: [string, any]) => {
        const avgRevenue = stats.revenue / stats.count;
        const avgParticipants = stats.participants / stats.count;
        const balanceScore = (avgRevenue / 10000) * 0.4 + (avgParticipants / 20) * 0.6; // Weighted balance
        
        return {
          classFormat: format,
          avgRevenue,
          avgParticipants,
          count: stats.count,
          balanceScore,
          isPriority: guidelines.priority.includes(format)
        };
      })
      .sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return b.balanceScore - a.balanceScore;
      });

    return availableClasses[0] || null;
  }

  private assignOptimalTeacher(
    classData: any, 
    day: string, 
    time: string, 
    trainerTracking: any, 
    existingSchedule: ScheduledClass[]
  ): string | null {
    // Get all available teachers
    const allTeachers = [...new Set(this.csvData.map(item => item.teacherName))]
      .filter(teacher => !teacher.includes('Nishanth') && !teacher.includes('Saniya'));

    // Find teachers who have taught this class format successfully
    const experiencedTeachers = this.csvData
      .filter(item => 
        item.cleanedClass === classData.classFormat && 
        item.participants > 5.0
      )
      .reduce((acc, item) => {
        if (!acc[item.teacherName]) {
          acc[item.teacherName] = { participants: 0, count: 0 };
        }
        acc[item.teacherName].participants += item.participants;
        acc[item.teacherName].count += 1;
        return acc;
      }, {} as any);

    // Rank teachers by their performance with this class format
    const rankedTeachers = Object.entries(experiencedTeachers)
      .map(([teacher, stats]: [string, any]) => ({
        teacher,
        avgParticipants: stats.participants / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants);

    // Try to assign the best available teacher
    for (const { teacher } of rankedTeachers) {
      if (this.canAssignTeacher(teacher, day, time, classData.classFormat, trainerTracking, existingSchedule)) {
        return teacher;
      }
    }

    // If no experienced teacher available, try any suitable teacher
    for (const teacher of allTeachers) {
      if (this.canAssignTeacher(teacher, day, time, classData.classFormat, trainerTracking, existingSchedule)) {
        return teacher;
      }
    }

    return null;
  }

  private canAssignTeacher(
    teacher: string, 
    day: string, 
    time: string, 
    classFormat: string, 
    trainerTracking: any, 
    existingSchedule: ScheduledClass[]
  ): boolean {
    // Check if teacher is new and restricted to certain formats
    const isNewTrainer = NEW_TRAINERS.some(name => teacher.includes(name));
    if (isNewTrainer) {
      const allowedFormats = ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'];
      if (!allowedFormats.includes(classFormat)) return false;
    }

    // Check if advanced format requires senior trainer
    if (ADVANCED_FORMATS.includes(classFormat)) {
      const isSeniorTrainer = SENIOR_TRAINERS.some(name => teacher.includes(name));
      if (!isSeniorTrainer) return false;
    }

    // Check weekly hour limits
    const weeklyHours = trainerTracking[teacher]?.totalHours || 0;
    const maxWeeklyHours = isNewTrainer ? 10 : 15;
    if (weeklyHours >= maxWeeklyHours) return false;

    // Check daily hour limits (max 4 hours per day)
    const dailyHours = trainerTracking[teacher]?.dailyHours?.[day] || 0;
    if (dailyHours >= 4) return false;

    // Check consecutive class limits (max 2 consecutive)
    const consecutiveClasses = this.getConsecutiveClasses(teacher, day, time, existingSchedule);
    if (consecutiveClasses >= 2) return false;

    return true;
  }

  private validateTrainerAssignment(
    teacher: string, 
    day: string, 
    time: string, 
    location: string, 
    trainerTracking: any, 
    existingSchedule: ScheduledClass[]
  ): boolean {
    // Check if trainer is already assigned to another location on this day
    const dayAssignments = existingSchedule.filter(cls => 
      `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher && cls.day === day
    );

    if (dayAssignments.length > 0) {
      const assignedLocation = dayAssignments[0].location;
      if (assignedLocation !== location) return false;
    }

    // Check shift restrictions (1 shift per day)
    const shift = this.getShift(time);
    const trainerShifts = trainerTracking[teacher]?.shifts?.[day] || [];
    if (trainerShifts.length > 0 && !trainerShifts.includes(shift)) return false;

    // Check trainer limit per shift
    const trainersInShift = this.getTrainersInShift(existingSchedule, location, day, time);
    const maxTrainersPerShift = day === 'Sunday' ? 1 : 3;
    
    if (!trainersInShift.includes(teacher) && trainersInShift.length >= maxTrainersPerShift) {
      return false;
    }

    return true;
  }

  private getShift(time: string): string {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 14) return 'morning';
    return 'evening';
  }

  private getTrainersInShift(schedule: ScheduledClass[], location: string, day: string, time: string): string[] {
    const shift = this.getShift(time);
    const shiftStart = shift === 'morning' ? 7 : 17;
    const shiftEnd = shift === 'morning' ? 14 : 22;

    return [...new Set(
      schedule
        .filter(cls => {
          const classHour = parseInt(cls.time.split(':')[0]);
          return cls.location === location && 
                 cls.day === day && 
                 classHour >= shiftStart && 
                 classHour < shiftEnd;
        })
        .map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`)
    )];
  }

  private getConsecutiveClasses(teacher: string, day: string, time: string, schedule: ScheduledClass[]): number {
    const teacherClasses = schedule
      .filter(cls => `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher && cls.day === day)
      .sort((a, b) => a.time.localeCompare(b.time));

    let consecutive = 0;
    const currentHour = parseInt(time.split(':')[0]);
    const currentMinute = parseInt(time.split(':')[1]);

    for (const cls of teacherClasses) {
      const classHour = parseInt(cls.time.split(':')[0]);
      const classMinute = parseInt(cls.time.split(':')[1]);
      
      // Check if classes are consecutive (within 1.5 hours)
      const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (classHour * 60 + classMinute));
      if (timeDiff <= 90) {
        consecutive++;
      }
    }

    return consecutive;
  }

  private isPeakHour(time: string): boolean {
    return PEAK_HOURS.morning.includes(time) || PEAK_HOURS.evening.includes(time);
  }

  private getMaxParallelClasses(location: string): number {
    if (location === 'Supreme HQ, Bandra') return 3;
    if (location === 'Kwality House, Kemps Corner') return 2;
    return 2;
  }

  private isClassAllowedAtLocation(classFormat: string, location: string): boolean {
    const lowerFormat = classFormat.toLowerCase();
    
    if (location === 'Supreme HQ, Bandra') {
      if (lowerFormat.includes('amped up') || lowerFormat.includes('hiit')) {
        return false;
      }
      return true;
    } else {
      if (lowerFormat.includes('powercycle') || lowerFormat.includes('power cycle')) {
        return false;
      }
      return true;
    }
  }

  private groupClassesByFormat(data: ClassData[]): Record<string, any> {
    return data.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) {
        acc[item.cleanedClass] = { participants: 0, revenue: 0, count: 0 };
      }
      acc[item.cleanedClass].participants += item.participants;
      acc[item.cleanedClass].revenue += item.totalRevenue;
      acc[item.cleanedClass].count += 1;
      return acc;
    }, {} as any);
  }

  private initializeTrainerTracking(): any {
    const allTeachers = [...new Set(this.csvData.map(item => item.teacherName))]
      .filter(teacher => !teacher.includes('Nishanth') && !teacher.includes('Saniya'));

    return allTeachers.reduce((acc, teacher) => {
      acc[teacher] = {
        totalHours: 0,
        dailyHours: {},
        shifts: {},
        locations: new Set(),
        consecutiveClasses: 0
      };
      
      this.days.forEach(day => {
        acc[teacher].dailyHours[day] = 0;
        acc[teacher].shifts[day] = [];
      });
      
      return acc;
    }, {} as any);
  }

  private updateTrainerTracking(
    teacher: string, 
    day: string, 
    time: string, 
    location: string, 
    tracking: any, 
    duration: number
  ): void {
    if (!tracking[teacher]) return;

    tracking[teacher].totalHours += duration;
    tracking[teacher].dailyHours[day] += duration;
    tracking[teacher].locations.add(location);
    
    const shift = this.getShift(time);
    if (!tracking[teacher].shifts[day].includes(shift)) {
      tracking[teacher].shifts[day].push(shift);
    }
  }

  private createScheduledClass(
    classData: any, 
    teacher: string, 
    day: string, 
    time: string, 
    location: string
  ): ScheduledClass {
    const [firstName, ...lastNameParts] = teacher.split(' ');
    
    return {
      id: `optimized-${location}-${day}-${time}-${Date.now()}-${Math.random()}`,
      day,
      time,
      location,
      classFormat: classData.classFormat,
      teacherFirstName: firstName,
      teacherLastName: lastNameParts.join(' '),
      duration: this.getClassDuration(classData.classFormat),
      participants: Math.round(classData.avgParticipants),
      revenue: Math.round(classData.avgRevenue || 0),
      isTopPerformer: classData.avgParticipants > 8
    };
  }

  private getClassDuration(className: string): string {
    const lowerName = className.toLowerCase();
    
    if (lowerName.includes('express')) return '0.75';
    if (lowerName.includes('recovery') || lowerName.includes('sweat in 30')) return '0.5';
    return '1';
  }

  private calculateMetrics(schedule: ScheduledClass[]): any {
    const totalRevenue = schedule.reduce((sum, cls) => sum + (cls.revenue || 0), 0);
    const totalAttendance = schedule.reduce((sum, cls) => sum + (cls.participants || 0), 0);
    const totalHours = schedule.reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
    const uniqueTeachers = new Set(schedule.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`)).size;
    
    return {
      totalRevenue,
      totalAttendance,
      teacherUtilization: totalHours / (uniqueTeachers * 15), // Percentage of max possible hours
      fillRate: totalAttendance / (schedule.length * 15), // Assuming 15 average capacity
      efficiency: (totalRevenue / totalHours) / 1000 // Revenue per hour in thousands
    };
  }

  private getTrainerAssignments(schedule: ScheduledClass[]): any {
    const assignments: any = {};
    
    schedule.forEach(cls => {
      const teacher = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      
      if (!assignments[teacher]) {
        assignments[teacher] = {
          hours: 0,
          shifts: [],
          locations: [],
          consecutiveClasses: 0
        };
      }
      
      assignments[teacher].hours += parseFloat(cls.duration);
      
      const shift = `${cls.day} ${this.getShift(cls.time)}`;
      if (!assignments[teacher].shifts.includes(shift)) {
        assignments[teacher].shifts.push(shift);
      }
      
      if (!assignments[teacher].locations.includes(cls.location)) {
        assignments[teacher].locations.push(cls.location);
      }
    });
    
    return assignments;
  }
}