import { Test, TestingModule } from '@nestjs/testing';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

describe('SupportController', () => {
  let supportController: SupportController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [SupportService],
    }).compile();

    supportController = app.get<SupportController>(SupportController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(supportController.getHello()).toBe('Hello World!');
    });
  });
});
