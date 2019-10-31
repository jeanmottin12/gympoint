import * as Yup from 'yup';
import { addMonths, isBefore, parseISO } from 'date-fns';
import Enrollments from '../models/Enrollments';
import Plans from '../models/Plans';
import Students from '../models/Students';

import NewEnrollmentMail from '../jobs/NewEnrollmentMail';
import Queue from '../../lib/Queue';

class EnrollmentsController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const enrollments = await Enrollments.findAll({
      attributes: [
        'id',
        'student_id',
        'plan_id',
        'start_date',
        'end_date',
        'price',
      ],
      limit: 10,
      offset: (page - 1) * 10,
      include: [
        {
          model: Students,
          as: 'student',
          attributes: ['name', 'email'],
        },
        {
          model: Plans,
          as: 'plan',
          attributes: ['title', 'duration', 'price'],
        },
      ],
    });

    return res.json(enrollments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      student_id: Yup.number().required(),
      plan_id: Yup.number().required(),
      start_date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { student_id, plan_id, start_date } = req.body;

    const plan = await Plans.findByPk(plan_id);
    const student = await Students.findByPk(student_id);

    if (!plan) {
      return res.status(400).json({ error: "Plan doesn't exists" });
    }

    if (!student) {
      return res.status(400).json({ error: "Student doesn't exists" });
    }

    /**
     * Check for past dates
     */
    const dateStart = parseISO(start_date);

    if (isBefore(dateStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const planDuration = plan.duration;
    const planPrice = plan.price * planDuration;

    const calcEndDate = addMonths(new Date(start_date), planDuration);

    const enrollment = await Enrollments.create({
      student_id,
      plan_id,
      start_date,
      end_date: calcEndDate,
      price: planPrice,
    });

    /**
     * Notify student by email
     */
    await Queue.add(NewEnrollmentMail.key, {
      enrollment,
    });

    return res.json(enrollment);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      plan_id: Yup.number(),
      start_date: Yup.date(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const enrollment_id = await Enrollments.findByPk(req.params.id);

    const { student_id, plan_id, start_date } = req.body;

    const plan = await Plans.findByPk(plan_id);
    const student = await Students.findByPk(student_id);

    if (!plan) {
      return res.status(400).json({ error: "Plan doesn't exists" });
    }

    if (!student) {
      return res.status(400).json({ error: "Student doesn't exists" });
    }

    /**
     * Check for past dates
     */
    const dateStart = parseISO(start_date);

    if (isBefore(dateStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const planDuration = plan.duration;
    const planPrice = plan.price * planDuration;

    const calcEndDate = addMonths(new Date(start_date), planDuration);

    const enrollment = await enrollment_id.update({
      student_id,
      plan_id,
      start_date,
      end_date: calcEndDate,
      price: planPrice,
    });

    return res.json(enrollment);
  }

  async delete(req, res) {
    const { id } = req.params;

    const enrollment = await Enrollments.findByPk(id);

    if (!enrollment) {
      return res.status(400).json({ error: "Enrollment doesn't exists" });
    }

    enrollment.destroy();

    return res.send();
  }
}

export default new EnrollmentsController();
